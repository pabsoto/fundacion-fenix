import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { camposModificados } from '../../common/utils/diferencias-auditoria.js';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import {
  FORMATOS,
  validarArchivoFoto,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  ActualizarContenidoDto,
  ContenidoInstitucionalAdminDto,
} from './dto/contenido-institucional-admin.dto.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

const MENSAJE_IMAGEN = 'No fue posible guardar la imagen';

@Injectable()
export class ContenidoInstitucionalAdminService {
  private readonly logger = new Logger(ContenidoInstitucionalAdminService.name);

  constructor(
    @InjectRepository(ContenidoInstitucional)
    private readonly repositorio: Repository<ContenidoInstitucional>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async listar(): Promise<ContenidoInstitucionalAdminDto[]> {
    try {
      const filas = await this.repositorio.find({
        order: { orden: 'ASC', clave: 'ASC' },
      });
      return filas.map((fila) => this.aDto(fila));
    } catch (error) {
      throw new ServiceUnavailableException(
        'El contenido del sitio no está disponible temporalmente',
        { cause: error },
      );
    }
  }

  async actualizar(
    clave: string,
    entrada: ActualizarContenidoDto,
    administradorId: string,
  ): Promise<ContenidoInstitucionalAdminDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const contenidos = manager.getRepository(ContenidoInstitucional);
        const auditorias = manager.getRepository(Auditoria);
        const fila = await contenidos.findOne({
          where: { clave },
          lock: { mode: 'pessimistic_write' },
        });
        if (!fila) {
          throw new NotFoundException('La sección de contenido no existe');
        }

        const datosAntes = this.aSnapshot(fila);
        fila.textoEs = entrada.textoEs;
        fila.textoEn = entrada.textoEn ?? null;
        fila.tituloEs = entrada.tituloEs ?? null;
        fila.tituloEn = entrada.tituloEn ?? null;
        fila.visible = entrada.visible;
        fila.actualizadoPorId = administradorId;
        fila.actualizadoEn = new Date();
        const guardada = await contenidos.save(fila);

        const datosDespues = this.aSnapshot(guardada);
        await auditorias.save(
          auditorias.create({
            administradorId,
            tabla: 'contenido_institucional',
            registroId: guardada.id,
            accion: 'UPDATE',
            camposModificados: camposModificados(datosAntes, datosDespues),
            datosAntes,
            datosDespues,
          }),
        );
        return this.aDto(guardada);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible guardar el contenido del sitio',
        { cause: error },
      );
    }
  }

  /**
   * Sustituye la imagen del bloque. El archivo nuevo queda guardado aunque
   * falle el borrado del anterior.
   */
  async reemplazarImagen(
    clave: string,
    archivo: ArchivoFotoCargado | undefined,
    administradorId: string,
  ): Promise<ContenidoInstitucionalAdminDto> {
    const tipo = validarArchivoFoto(archivo);
    const { buffer } = archivo!;
    const bloque = await this.buscarBloque(clave);

    const ruta = `contenido/${bloque.clave}/${randomUUID()}.${FORMATOS[tipo]}`;
    try {
      await this.storage.subir(ruta, buffer, tipo);
    } catch (error) {
      throw new ServiceUnavailableException(MENSAJE_IMAGEN, { cause: error });
    }

    let anterior: string | null;
    let resultado: ContenidoInstitucionalAdminDto;
    try {
      [anterior, resultado] = await this.dataSource.transaction(
        async (manager) => {
          const contenidos = manager.getRepository(ContenidoInstitucional);
          const auditorias = manager.getRepository(Auditoria);
          const fila = await contenidos.findOne({
            where: { clave },
            lock: { mode: 'pessimistic_write' },
          });
          if (!fila) {
            throw new NotFoundException('La sección de contenido no existe');
          }

          const datosAntes = this.aSnapshot(fila);
          const rutaAnterior = fila.imagenRuta;
          fila.imagenRuta = ruta;
          fila.actualizadoPorId = administradorId;
          fila.actualizadoEn = new Date();
          const guardada = await contenidos.save(fila);
          const datosDespues = this.aSnapshot(guardada);
          await auditorias.save(
            auditorias.create({
              administradorId,
              tabla: 'contenido_institucional',
              registroId: guardada.id,
              accion: 'UPDATE',
              camposModificados: camposModificados(datosAntes, datosDespues),
              datosAntes,
              datosDespues,
            }),
          );
          return [rutaAnterior, this.aDto(guardada)] as const;
        },
      );
    } catch (error) {
      await this.limpiar(ruta);
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(MENSAJE_IMAGEN, { cause: error });
    }

    if (anterior && anterior !== ruta) await this.limpiar(anterior);
    return resultado;
  }

  private async buscarBloque(clave: string): Promise<ContenidoInstitucional> {
    let fila: ContenidoInstitucional | null;
    try {
      fila = await this.repositorio.findOne({ where: { clave } });
    } catch (error) {
      throw new ServiceUnavailableException(
        'El contenido del sitio no está disponible temporalmente',
        { cause: error },
      );
    }
    if (!fila) {
      throw new NotFoundException('La sección de contenido no existe');
    }
    return fila;
  }

  /** Un fallo al borrar no deshace la imagen que ya quedó guardada. */
  private async limpiar(ruta: string): Promise<void> {
    await this.storage.eliminar(ruta).catch((error: unknown) => {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage para ${ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    });
  }

  private aDto(fila: ContenidoInstitucional): ContenidoInstitucionalAdminDto {
    return {
      clave: fila.clave,
      tituloEs: fila.tituloEs,
      tituloEn: fila.tituloEn,
      textoEs: fila.textoEs,
      textoEn: fila.textoEn,
      imagenRuta: fila.imagenRuta,
      imagenUrl: fila.imagenRuta
        ? this.storage.obtenerUrlPublica(fila.imagenRuta)
        : null,
      orden: fila.orden,
      visible: fila.visible,
      actualizadoEn: fila.actualizadoEn,
    };
  }

  private aSnapshot(fila: ContenidoInstitucional): Record<string, unknown> {
    return {
      id: fila.id,
      clave: fila.clave,
      titulo_es: fila.tituloEs,
      titulo_en: fila.tituloEn,
      texto_es: fila.textoEs,
      texto_en: fila.textoEn,
      imagen_ruta: fila.imagenRuta,
      orden: fila.orden,
      visible: fila.visible,
      actualizado_por: fila.actualizadoPorId,
      actualizado_en: fila.actualizadoEn,
    };
  }
}
