import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { StorageService } from '../storage/storage.service.js';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { ResultadoQrDonacionDto } from './dto/subir-qr-donacion.dto.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

export const TAMANO_MAXIMO_QR = 2 * 1024 * 1024;

export interface ArchivoQrCargado {
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

interface FormatoImagen {
  readonly extension: 'png' | 'jpg' | 'webp';
  readonly contentType: 'image/png' | 'image/jpeg' | 'image/webp';
}

@Injectable()
export class DonacionesQrService {
  private readonly logger = new Logger(DonacionesQrService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async reemplazar(
    archivo: ArchivoQrCargado | undefined,
    qrVenceEl: string | undefined,
    administradorId: string,
  ): Promise<ResultadoQrDonacionDto> {
    const formato = this.validarArchivo(archivo);
    let rutaNueva: string | null = null;
    let subidaCompleta = false;

    try {
      const resultado = await this.dataSource.transaction(
        'SERIALIZABLE',
        async (manager) => {
          const donacion = await this.obtenerActivaBloqueada(manager);
          rutaNueva = `qr/${donacion.id}/${randomUUID()}.${formato.extension}`;

          await this.storage.subir(
            rutaNueva,
            archivo!.buffer,
            formato.contentType,
          );
          subidaCompleta = true;

          const rutaAnterior = donacion.qrRuta;
          const antes = this.snapshotQr(donacion);
          donacion.qrRuta = rutaNueva;
          donacion.qrVenceEl = qrVenceEl ?? null;
          donacion.actualizadoPorId = administradorId;
          donacion.actualizadoEn = new Date();
          await manager.getRepository(DatoDonacion).save(donacion);
          await this.auditar(manager, donacion, administradorId, antes);

          return { rutaAnterior, venceEl: donacion.qrVenceEl };
        },
      );

      if (resultado.rutaAnterior && resultado.rutaAnterior !== rutaNueva) {
        await this.eliminarSinInvalidarOperacion(
          resultado.rutaAnterior,
          'reemplazo confirmado',
        );
      }

      return {
        qr: { disponible: true, venceEl: resultado.venceEl },
      };
    } catch (error) {
      if (subidaCompleta && rutaNueva) {
        await this.eliminarSinInvalidarOperacion(
          rutaNueva,
          'compensación por fallo de PostgreSQL',
        );
      }

      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible guardar el QR de donaciones',
      );
    }
  }

  async retirar(administradorId: string): Promise<ResultadoQrDonacionDto> {
    try {
      const rutaAnterior = await this.dataSource.transaction(
        'SERIALIZABLE',
        async (manager) => {
          const donacion = await this.obtenerActivaBloqueada(manager);
          const ruta = donacion.qrRuta;
          if (!ruta) {
            return null;
          }

          const antes = this.snapshotQr(donacion);
          donacion.qrRuta = null;
          donacion.qrVenceEl = null;
          donacion.actualizadoPorId = administradorId;
          donacion.actualizadoEn = new Date();
          await manager.getRepository(DatoDonacion).save(donacion);
          await this.auditar(manager, donacion, administradorId, antes);
          return ruta;
        },
      );

      if (rutaAnterior) {
        await this.eliminarSinInvalidarOperacion(
          rutaAnterior,
          'retiro confirmado',
        );
      }

      return { qr: { disponible: false, venceEl: null } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible retirar el QR de donaciones',
      );
    }
  }

  private validarArchivo(archivo: ArchivoQrCargado | undefined): FormatoImagen {
    if (!archivo?.buffer || archivo.size === 0) {
      throw new BadRequestException('Debe adjuntar una imagen QR');
    }
    if (archivo.size > TAMANO_MAXIMO_QR) {
      throw new PayloadTooLargeException(
        'La imagen QR no puede superar los 2 MB',
      );
    }

    const extension = archivo.originalname.split('.').pop()?.toLowerCase();
    const detectado = this.detectarFormato(archivo.buffer);
    const extensionesValidas: Record<FormatoImagen['extension'], string[]> = {
      png: ['png'],
      jpg: ['jpg', 'jpeg'],
      webp: ['webp'],
    };

    if (
      !detectado ||
      !extension ||
      !extensionesValidas[detectado.extension].includes(extension) ||
      archivo.mimetype.toLowerCase() !== detectado.contentType
    ) {
      throw new BadRequestException(
        'La imagen debe ser un PNG, JPG/JPEG o WebP válido y coherente con su extensión y tipo MIME',
      );
    }

    return detectado;
  }

  private detectarFormato(buffer: Buffer): FormatoImagen | null {
    const pngInicio = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const pngFinal = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    if (
      buffer.length >= 20 &&
      buffer.subarray(0, 8).equals(pngInicio) &&
      buffer.subarray(-12).equals(pngFinal)
    ) {
      return { extension: 'png', contentType: 'image/png' };
    }

    if (
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer.at(-2) === 0xff &&
      buffer.at(-1) === 0xd9
    ) {
      return { extension: 'jpg', contentType: 'image/jpeg' };
    }

    if (
      buffer.length >= 16 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP' &&
      ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16)) &&
      buffer.readUInt32LE(4) + 8 === buffer.length
    ) {
      return { extension: 'webp', contentType: 'image/webp' };
    }

    return null;
  }

  private async obtenerActivaBloqueada(
    manager: EntityManager,
  ): Promise<DatoDonacion> {
    const activas = await manager.getRepository(DatoDonacion).find({
      where: { activo: true },
      take: 2,
      lock: { mode: 'pessimistic_write' },
    });
    if (activas.length === 0) {
      throw new NotFoundException(
        'Primero debe registrar los datos bancarios de donaciones',
      );
    }
    if (activas.length > 1) {
      throw new ConflictException(
        'Existe más de una configuración activa de donaciones',
      );
    }
    return activas[0];
  }

  private async auditar(
    manager: EntityManager,
    donacion: DatoDonacion,
    administradorId: string,
    datosAntes: Record<string, unknown>,
  ): Promise<void> {
    const datosDespues = this.snapshotQr(donacion);
    const camposModificados = Object.keys(datosDespues).filter(
      (campo) => datosAntes[campo] !== datosDespues[campo],
    );
    const auditorias = manager.getRepository(Auditoria);
    await auditorias.save(
      auditorias.create({
        administradorId,
        tabla: 'datos_donacion',
        registroId: donacion.id,
        accion: 'UPDATE',
        camposModificados,
        datosAntes,
        datosDespues,
      }),
    );
  }

  private snapshotQr(donacion: DatoDonacion): Record<string, unknown> {
    return {
      qr_ruta: donacion.qrRuta,
      qr_vence_el: donacion.qrVenceEl,
      actualizado_por: donacion.actualizadoPorId,
      actualizado_en: donacion.actualizadoEn,
    };
  }

  private async eliminarSinInvalidarOperacion(
    ruta: string,
    motivo: string,
  ): Promise<void> {
    try {
      await this.storage.eliminar(ruta);
    } catch (error) {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage (${motivo}) para ${ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    }
  }
}
