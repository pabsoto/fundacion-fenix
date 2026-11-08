import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service.js';
import { FotoCampanaDto } from './dto/foto-campana.dto.js';
import { Campana } from './entities/campana.entity.js';
import { FotoCampana } from './entities/foto-campana.entity.js';

export const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;

export interface ArchivoFotoCargado {
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

const FORMATOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type TipoFoto = keyof typeof FORMATOS;

function detectarTipo(buffer: Buffer): TipoFoto | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

@Injectable()
export class FotosCampanaService {
  private readonly logger = new Logger(FotosCampanaService.name);

  constructor(
    @InjectRepository(Campana)
    private readonly campanas: Repository<Campana>,
    @InjectRepository(FotoCampana)
    private readonly fotos: Repository<FotoCampana>,
    private readonly storage: StorageService,
  ) {}

  async subir(
    campanaId: string,
    archivo: ArchivoFotoCargado | undefined,
    administradorId: string,
  ): Promise<FotoCampanaDto> {
    const tipo = this.validar(archivo);
    const { buffer, size } = archivo!;

    const campana = await this.campanas.findOne({ where: { id: campanaId } });
    if (!campana) {
      throw new NotFoundException('La campaña no existe');
    }

    const ruta = `campanas/${campanaId}/${randomUUID()}.${FORMATOS[tipo]}`;

    try {
      await this.storage.subir(ruta, buffer, tipo);
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía',
      );
    }

    try {
      const { maximo } = (await this.fotos
        .createQueryBuilder('foto')
        .select('COALESCE(MAX(foto.orden), 0)', 'maximo')
        .where('foto.campanaId = :campanaId', { campanaId })
        .getRawOne<{ maximo: number | string }>())!;

      const foto = await this.fotos.save(
        this.fotos.create({
          campanaId,
          ruta,
          contentType: tipo,
          tamano: size,
          orden: Number(maximo) + 1,
          creadoPorId: administradorId,
        }),
      );

      return {
        id: foto.id,
        campanaId,
        orden: foto.orden,
        url: this.storage.obtenerUrlPublica(ruta),
      };
    } catch {
      await this.storage.eliminar(ruta).catch((error: unknown) => {
        this.logger.error(
          `Limpieza pendiente de Supabase Storage para ${ruta}`,
          error instanceof Error ? error.message : 'Error de Storage',
        );
      });
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía',
      );
    }
  }

  private validar(archivo: ArchivoFotoCargado | undefined): TipoFoto {
    if (!archivo?.buffer || archivo.size === 0) {
      throw new BadRequestException('Debe adjuntar una fotografía');
    }
    if (archivo.size > TAMANO_MAXIMO_FOTO) {
      throw new PayloadTooLargeException(
        'La fotografía no puede superar los 5 MB',
      );
    }

    const tipo = detectarTipo(archivo.buffer);
    if (!tipo || archivo.mimetype.toLowerCase() !== tipo) {
      throw new UnsupportedMediaTypeException(
        'La fotografía debe ser un JPG, PNG o WebP válido',
      );
    }
    return tipo;
  }
}
