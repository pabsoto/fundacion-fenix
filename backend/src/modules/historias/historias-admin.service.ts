import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service.js';
import { HistoriaAdminDto } from './dto/historia-admin.dto.js';
import {
  ActualizarHistoriaDto,
  GuardarHistoriaDto,
} from './dto/guardar-historia.dto.js';
import { Historia } from './entities/historia.entity.js';
import { aHistoriaAdminDto } from './historia-admin.mapper.js';

/**
 * Escrituras administrativas de historias destacadas.
 *
 * La auditoría la registra el disparador `trg_historias_auditoria`, que toma
 * el administrador de `actualizado_por`: no se inserta nada en `auditoria`
 * desde aquí y toda escritura debe informar ese campo.
 */
@Injectable()
export class HistoriasAdminService {
  private readonly logger = new Logger(HistoriasAdminService.name);

  constructor(
    @InjectRepository(Historia)
    private readonly historias: Repository<Historia>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  /** Historias no eliminadas, incluidas las ocultas. */
  async listar(): Promise<HistoriaAdminDto[]> {
    try {
      const historias = await this.historias.find({
        where: { eliminadoEn: IsNull() },
        order: { orden: 'ASC', fechaHistoria: 'DESC', id: 'ASC' },
      });
      return historias.map((historia) => this.aDto(historia));
    } catch (error) {
      throw new ServiceUnavailableException(
        'Las historias no están disponibles temporalmente',
        { cause: error },
      );
    }
  }

  /** La historia nueva queda oculta y al final del orden. */
  async crear(
    entrada: GuardarHistoriaDto,
    administradorId: string,
  ): Promise<HistoriaAdminDto> {
    return this.ejecutar(
      'No fue posible crear la historia',
      async (manager) => {
        const historias = manager.getRepository(Historia);
        const maximo = await historias.maximum('orden', {
          eliminadoEn: IsNull(),
        });
        const ahora = new Date();
        const guardada = await historias.save(
          historias.create({
            ...this.camposEditables(entrada),
            orden: Number(maximo ?? 0) + 1,
            visible: false,
            fotoRuta: null,
            fotoContentType: null,
            fotoTamano: null,
            fotoAncho: null,
            fotoAlto: null,
            creadoPorId: administradorId,
            actualizadoPorId: administradorId,
            creadoEn: ahora,
            actualizadoEn: ahora,
          }),
        );
        return this.aDto(guardada);
      },
    );
  }

  async actualizar(
    id: string,
    entrada: ActualizarHistoriaDto,
    administradorId: string,
  ): Promise<HistoriaAdminDto> {
    return this.ejecutar(
      'No fue posible actualizar la historia',
      async (manager) => {
        const historias = manager.getRepository(Historia);
        const existente = await this.bloquear(historias, id);
        if (entrada.visible && !existente.fotoRuta) {
          throw new ConflictException(
            'Sube la fotografía antes de publicar la historia',
          );
        }

        Object.assign(existente, this.camposEditables(entrada), {
          visible: entrada.visible,
          actualizadoPorId: administradorId,
          actualizadoEn: new Date(),
        });
        return this.aDto(await historias.save(existente));
      },
    );
  }

  /**
   * Fija el orden de las historias. `ids` debe traer todas las no eliminadas,
   * sin repetir ni agregar otras. Solo se escriben las que cambian de lugar.
   */
  async reordenar(
    ids: string[],
    administradorId: string,
  ): Promise<HistoriaAdminDto[]> {
    return this.ejecutar(
      'No fue posible reordenar las historias',
      async (manager) => {
        const historias = manager.getRepository(Historia);
        const actuales = await historias.find({
          where: { eliminadoEn: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });

        const porId = new Map(actuales.map((fila) => [fila.id, fila]));
        const completo =
          ids.length === actuales.length &&
          new Set(ids).size === ids.length &&
          ids.every((id) => porId.has(id));
        if (!completo) {
          throw new BadRequestException(
            'La lista debe incluir exactamente las historias existentes, sin repetir',
          );
        }

        const ordenadas = ids.map((id) => porId.get(id)!);
        const ahora = new Date();
        const movidas: Historia[] = [];
        ordenadas.forEach((historia, indice) => {
          if (historia.orden === indice + 1) return;
          Object.assign(historia, {
            orden: indice + 1,
            actualizadoPorId: administradorId,
            actualizadoEn: ahora,
          });
          movidas.push(historia);
        });
        await historias.save(movidas);

        return ordenadas.map((historia) => this.aDto(historia));
      },
    );
  }

  /**
   * Borrado lógico. La fila se conserva, pero la foto se quita de Storage para
   * que no quede nada publicado.
   */
  async eliminar(id: string, administradorId: string): Promise<void> {
    const ruta = await this.ejecutar(
      'No fue posible eliminar la historia',
      async (manager) => {
        const historias = manager.getRepository(Historia);
        const existente = await this.bloquear(historias, id);
        const rutaFoto = existente.fotoRuta;

        const ahora = new Date();
        Object.assign(existente, {
          visible: false,
          fotoRuta: null,
          fotoContentType: null,
          fotoTamano: null,
          fotoAncho: null,
          fotoAlto: null,
          eliminadoEn: ahora,
          eliminadoPorId: administradorId,
          actualizadoPorId: administradorId,
          actualizadoEn: ahora,
        });
        await historias.save(existente);
        return rutaFoto;
      },
    );

    // Después de confirmar el borrado: si Storage falla, queda registrado.
    if (!ruta) return;
    await this.storage.eliminar(ruta).catch((error: unknown) => {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage para ${ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    });
  }

  private async bloquear(
    historias: Repository<Historia>,
    id: string,
  ): Promise<Historia> {
    const historia = await historias.findOne({
      where: { id, eliminadoEn: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!historia) throw new NotFoundException('La historia no existe');
    return historia;
  }

  /** Ejecuta una escritura atómica (con su auditoría) y traduce errores. */
  private async ejecutar<T>(
    mensajeFallo: string,
    operacion: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction('READ COMMITTED', operacion);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(mensajeFallo, { cause: error });
    }
  }

  private camposEditables(entrada: GuardarHistoriaDto) {
    return {
      animalNombre: entrada.animalNombre,
      tituloEs: entrada.tituloEs,
      tituloEn: entrada.tituloEn,
      textoEs: entrada.textoEs,
      textoEn: entrada.textoEn,
      autorNombre: entrada.autorNombre ?? null,
      fechaHistoria: entrada.fechaHistoria,
    };
  }

  private aDto(historia: Historia): HistoriaAdminDto {
    return aHistoriaAdminDto(historia, this.storage);
  }
}
