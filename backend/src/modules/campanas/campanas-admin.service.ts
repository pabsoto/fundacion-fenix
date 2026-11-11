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
import {
  Between,
  DataSource,
  EntityManager,
  In,
  IsNull,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import {
  CampanaAdminDto,
  FotoCampanaAdminDto,
  TotalesCampanaDto,
} from './dto/campana-admin.dto.js';
import {
  CifrasPeriodoDto,
  ConsultaCifrasDto,
} from './dto/consulta-cifras.dto.js';
import {
  datosDePagina,
  resolverPagina,
} from '../../common/dto/pagina.dto.js';
import {
  ConsultaCampanasDto,
  ContadoresCampanaDto,
  PaginaCampanasDto,
} from './dto/consulta-campanas.dto.js';
import { CorregirCifrasCampanaDto } from './dto/corregir-cifras-campana.dto.js';
import { GuardarCampanaDto } from './dto/guardar-campana.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { Campana, type EstadoCampana } from './entities/campana.entity.js';
import { FotoCampana } from './entities/foto-campana.entity.js';

const TABLA = 'campanas';

const CODIGOS_DATOS_INVALIDOS = new Set([
  '23514', // check_violation
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow
]);

@Injectable()
export class CampanasAdminService {
  private readonly logger = new Logger(CampanasAdminService.name);

  constructor(
    @InjectRepository(Campana)
    private readonly repositorio: Repository<Campana>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(FotoCampana)
    private readonly fotos: Repository<FotoCampana>,
    private readonly storage: StorageService,
  ) {}

  async listar(
    consulta: ConsultaCampanasDto = {},
  ): Promise<PaginaCampanasDto> {
    const { pagina, limite, desde } = resolverPagina(consulta);
    try {
      const filtrada = () => {
        const qb = this.repositorio
          .createQueryBuilder('c')
          .where('c.eliminadoEn IS NULL');
        if (consulta.anio !== undefined) {
          qb.andWhere('EXTRACT(YEAR FROM c.fecha) = :anio', {
            anio: consulta.anio,
          });
        }
        if (consulta.mes !== undefined) {
          qb.andWhere('EXTRACT(MONTH FROM c.fecha) = :mes', {
            mes: consulta.mes,
          });
        }
        return qb;
      };

      const [campanas, total] = await filtrada()
        .orderBy('c.fecha', 'DESC', 'NULLS LAST')
        .addOrderBy('c.creadoEn', 'DESC')
        .addOrderBy('c.id', 'ASC')
        .offset(desde)
        .limit(limite)
        .getManyAndCount();

      const suma = await filtrada()
        .select('COALESCE(SUM(c.perrosMachos), 0)', 'perrosMachos')
        .addSelect('COALESCE(SUM(c.perrosHembras), 0)', 'perrosHembras')
        .addSelect('COALESCE(SUM(c.gatosMachos), 0)', 'gatosMachos')
        .addSelect('COALESCE(SUM(c.gatosHembras), 0)', 'gatosHembras')
        .getRawOne<Record<keyof ContadoresCampanaDto, string | number>>();
      const contadores: ContadoresCampanaDto = {
        perrosMachos: Number(suma?.perrosMachos ?? 0),
        perrosHembras: Number(suma?.perrosHembras ?? 0),
        gatosMachos: Number(suma?.gatosMachos ?? 0),
        gatosHembras: Number(suma?.gatosHembras ?? 0),
      };

      const aniosRaw = await this.repositorio
        .createQueryBuilder('c')
        .select('DISTINCT CAST(EXTRACT(YEAR FROM c.fecha) AS integer)', 'valor')
        .where('c.fecha IS NOT NULL')
        .andWhere('c.eliminadoEn IS NULL')
        .orderBy('valor', 'DESC')
        .getRawMany<{ valor: number | string }>();

      const mesesQb = this.repositorio
        .createQueryBuilder('c')
        .select('DISTINCT CAST(EXTRACT(MONTH FROM c.fecha) AS integer)', 'valor')
        .where('c.fecha IS NOT NULL')
        .andWhere('c.eliminadoEn IS NULL');
      if (consulta.anio !== undefined) {
        mesesQb.andWhere('EXTRACT(YEAR FROM c.fecha) = :anio', {
          anio: consulta.anio,
        });
      }
      const mesesRaw = await mesesQb
        .orderBy('valor', 'ASC')
        .getRawMany<{ valor: number | string }>();

      return {
        items: await this.aDtos(campanas),
        ...datosDePagina(total, pagina, limite),
        contadores,
        totales: this.calcularTotales(contadores),
        anios: aniosRaw.map((fila) => Number(fila.valor)),
        meses: mesesRaw.map((fila) => Number(fila.valor)),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }
  }

  async consultarCifras(
    consulta: ConsultaCifrasDto,
  ): Promise<CifrasPeriodoDto> {
    const { anio, mes, estado } = consulta;
    const mesTexto = mes === undefined ? null : String(mes).padStart(2, '0');
    const desde = `${anio}-${mesTexto ?? '01'}-01`;
    const ultimoDia =
      mes === undefined ? 31 : new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const hasta = `${anio}-${mesTexto ?? '12'}-${String(ultimoDia).padStart(2, '0')}`;

    let campanas: Campana[];
    let detalle: CampanaAdminDto[];
    try {
      campanas = await this.repositorio.find({
        where: {
          fecha: Between(desde, hasta),
          eliminadoEn: IsNull(),
          ...(estado && { estado }),
        },
        order: { fecha: 'ASC', creadoEn: 'ASC' },
      });
      detalle = await this.aDtos(campanas);
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }

    const suma = campanas.reduce(
      (acumulado, campana) => ({
        perrosMachos: acumulado.perrosMachos + campana.perrosMachos,
        perrosHembras: acumulado.perrosHembras + campana.perrosHembras,
        gatosMachos: acumulado.gatosMachos + campana.gatosMachos,
        gatosHembras: acumulado.gatosHembras + campana.gatosHembras,
      }),
      { perrosMachos: 0, perrosHembras: 0, gatosMachos: 0, gatosHembras: 0 },
    );

    return {
      periodo: { anio, mes: mes ?? null },
      totales: this.calcularTotales(suma),
      campanas: detalle,
    };
  }

  async obtener(id: string): Promise<CampanaAdminDto> {
    let campana: Campana | null;
    let fotos: FotoCampanaAdminDto[] = [];
    try {
      campana = await this.repositorio.findOne({
        where: { id, eliminadoEn: IsNull() },
      });
      if (campana) fotos = (await this.urlsDeFotos([id])).get(id) ?? [];
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }
    if (!campana) throw new NotFoundException('La campaña no existe');
    return this.aDto(campana, fotos);
  }

  async corregirCifras(
    id: string,
    entrada: CorregirCifrasCampanaDto,
    administradorId: string,
  ): Promise<CampanaAdminDto> {
    return this.ejecutar(
      'No fue posible corregir las cifras de la campaña',
      async (manager) => {
        const campanas = manager.getRepository(Campana);
        const existente = await campanas.findOne({
          where: { id, eliminadoEn: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!existente) throw new NotFoundException('La campaña no existe');
        if (existente.estado !== 'cerrada') {
          throw new ConflictException(
            'Solo se pueden corregir cifras de campañas cerradas',
          );
        }

        const datosAntes = this.aSnapshot(existente);
        Object.assign(existente, entrada, {
          actualizadoPorId: administradorId,
          actualizadoEn: new Date(),
        });
        const guardada = await campanas.save(existente);
        const datosDespues = this.aSnapshot(guardada);
        await this.auditar(manager.getRepository(Auditoria), {
          administradorId,
          registroId: guardada.id,
          accion: 'UPDATE',
          camposModificados: Object.keys(datosDespues).filter(
            (campo) =>
              campo !== 'id' && datosAntes[campo] !== datosDespues[campo],
          ),
          datosAntes,
          datosDespues,
        });
        return this.aDto(guardada);
      },
    );
  }

  async crear(
    entrada: GuardarCampanaDto,
    administradorId: string,
  ): Promise<CampanaAdminDto> {
    // Una campaña nueva todavía no tiene fotografías.
    return this.ejecutar('No fue posible crear la campaña', async (manager) => {
      const campanas = manager.getRepository(Campana);
      const ahora = new Date();
      const guardada = await campanas.save(
        campanas.create({
          ...this.camposEditables(entrada),
          creadoPorId: administradorId,
          actualizadoPorId: administradorId,
          creadoEn: ahora,
          actualizadoEn: ahora,
        }),
      );
      const datosDespues = this.aSnapshot(guardada);

      await this.auditar(manager.getRepository(Auditoria), {
        administradorId,
        registroId: guardada.id,
        accion: 'INSERT',
        camposModificados: Object.keys(datosDespues).filter(
          (campo) => campo !== 'id' && datosDespues[campo] !== null,
        ),
        datosAntes: null,
        datosDespues,
      });
      return this.aDto(guardada);
    });
  }

  async actualizar(
    id: string,
    entrada: GuardarCampanaDto,
    administradorId: string,
  ): Promise<CampanaAdminDto> {
    const actualizada = await this.ejecutar(
      'No fue posible actualizar la campaña',
      async (manager) => {
        const campanas = manager.getRepository(Campana);
        const existente = await campanas.findOne({
          where: { id, eliminadoEn: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!existente) throw new NotFoundException('La campaña no existe');
        if (existente.estado === 'cerrada') {
          throw new ConflictException(
            'Las campañas cerradas no se pueden editar desde este formulario',
          );
        }

        const datosAntes = this.aSnapshot(existente);
        Object.assign(existente, this.camposEditables(entrada), {
          actualizadoPorId: administradorId,
          actualizadoEn: new Date(),
        });
        const guardada = await campanas.save(existente);
        const datosDespues = this.aSnapshot(guardada);

        await this.auditar(manager.getRepository(Auditoria), {
          administradorId,
          registroId: guardada.id,
          accion: 'UPDATE',
          camposModificados: Object.keys(datosDespues).filter(
            (campo) =>
              campo !== 'id' && datosAntes[campo] !== datosDespues[campo],
          ),
          datosAntes,
          datosDespues,
        });
        return guardada;
      },
    );
    return this.aDto(actualizada, await this.fotosSinFallar(id));
  }

  /**
   * Borrado lógico de una campaña que aún no cuenta en el contador público
   * (borrador o publicada): deja de aparecer en el panel y en el sitio, pero el
   * registro se conserva para auditarlo. Sus fotografías se borran de la base y
   * de Storage porque la campaña ya no se muestra.
   */
  async eliminar(id: string, administradorId: string): Promise<void> {
    const rutas = await this.ejecutar(
      'No fue posible eliminar la campaña',
      async (manager) => {
        const campanas = manager.getRepository(Campana);
        const existente = await campanas.findOne({
          where: { id, eliminadoEn: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!existente) throw new NotFoundException('La campaña no existe');
        if (existente.esHistorico) {
          throw new ConflictException(
            'La campaña histórica no se puede eliminar',
          );
        }
        if (existente.estado === 'cerrada') {
          throw new ConflictException('Reabre la campaña antes de eliminarla');
        }

        const datosAntes = this.aSnapshot(existente);
        const fotos = manager.getRepository(FotoCampana);
        const rutasFotos = (await fotos.find({ where: { campanaId: id } })).map(
          (foto) => foto.ruta,
        );
        await fotos.delete({ campanaId: id });

        const ahora = new Date();
        Object.assign(existente, {
          eliminadoEn: ahora,
          eliminadoPorId: administradorId,
          actualizadoPorId: administradorId,
          actualizadoEn: ahora,
        });
        await campanas.save(existente);

        await this.auditar(manager.getRepository(Auditoria), {
          administradorId,
          registroId: id,
          accion: 'DELETE',
          camposModificados: Object.keys(datosAntes).filter(
            (campo) => campo !== 'id',
          ),
          datosAntes,
          datosDespues: null,
        });
        return rutasFotos;
      },
    );

    // Después de confirmar el borrado: si Storage falla, queda registrado.
    for (const ruta of rutas) {
      await this.storage.eliminar(ruta).catch((error: unknown) => {
        this.logger.error(
          `Limpieza pendiente de Supabase Storage para ${ruta}`,
          error instanceof Error ? error.message : 'Error de Storage',
        );
      });
    }
  }

  /**
   * Cierra una campaña publicada: desde ese momento sus cifras cuentan en el
   * contador público y deja de editarse desde el formulario.
   */
  async cerrar(
    id: string,
    administradorId: string,
  ): Promise<CampanaAdminDto> {
    return this.cambiarEstado(
      id,
      administradorId,
      'cerrada',
      'No fue posible cerrar la campaña',
      (existente) => {
        if (existente.estado === 'cerrada') {
          throw new ConflictException('La campaña ya está cerrada');
        }
        if (existente.estado !== 'publicada') {
          throw new ConflictException(
            'Solo se puede cerrar una campaña publicada',
          );
        }
        const total =
          existente.perrosMachos +
          existente.perrosHembras +
          existente.gatosMachos +
          existente.gatosHembras;
        if (total <= 0) {
          throw new BadRequestException(
            'Registra al menos una esterilización antes de cerrar la campaña',
          );
        }
      },
    );
  }

  /**
   * Vuelve a publicar una campaña cerrada para poder corregirla. Sus cifras
   * dejan de contar en el contador público hasta que se cierre de nuevo.
   */
  async reabrir(
    id: string,
    administradorId: string,
  ): Promise<CampanaAdminDto> {
    return this.cambiarEstado(
      id,
      administradorId,
      'publicada',
      'No fue posible reabrir la campaña',
      (existente) => {
        if (existente.estado !== 'cerrada') {
          throw new ConflictException('La campaña no está cerrada');
        }
        if (existente.esHistorico) {
          throw new ConflictException(
            'La campaña histórica siempre permanece cerrada',
          );
        }
      },
    );
  }

  private async cambiarEstado(
    id: string,
    administradorId: string,
    estado: EstadoCampana,
    mensajeFallo: string,
    validar: (existente: Campana) => void,
  ): Promise<CampanaAdminDto> {
    const actualizada = await this.ejecutar(mensajeFallo, async (manager) => {
      const campanas = manager.getRepository(Campana);
      const existente = await campanas.findOne({
        where: { id, eliminadoEn: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existente) throw new NotFoundException('La campaña no existe');
      validar(existente);

      const datosAntes = this.aSnapshot(existente);
      Object.assign(existente, {
        estado,
        actualizadoPorId: administradorId,
        actualizadoEn: new Date(),
      });
      const guardada = await campanas.save(existente);
      const datosDespues = this.aSnapshot(guardada);

      await this.auditar(manager.getRepository(Auditoria), {
        administradorId,
        registroId: guardada.id,
        accion: 'UPDATE',
        camposModificados: Object.keys(datosDespues).filter(
          (campo) => campo !== 'id' && datosAntes[campo] !== datosDespues[campo],
        ),
        datosAntes,
        datosDespues,
      });
      return guardada;
    });
    return this.aDto(actualizada, await this.fotosSinFallar(id));
  }

  /** La escritura ya se guardó: si las fotos fallan, se responde sin ellas. */
  private async fotosSinFallar(id: string): Promise<FotoCampanaAdminDto[]> {
    try {
      return (await this.urlsDeFotos([id])).get(id) ?? [];
    } catch {
      return [];
    }
  }

  /** Una sola consulta para todas las campañas, ordenadas como la galería. */
  private async urlsDeFotos(
    ids: string[],
  ): Promise<Map<string, FotoCampanaAdminDto[]>> {
    const urls = new Map<string, FotoCampanaAdminDto[]>();
    if (ids.length === 0) return urls;
    const fotos = await this.fotos.find({
      where: { campanaId: In(ids) },
      order: { orden: 'ASC' },
    });
    for (const foto of fotos) {
      const lista = urls.get(foto.campanaId) ?? [];
      lista.push({
        id: foto.id,
        url: this.storage.obtenerUrlPublica(foto.ruta),
        orden: foto.orden,
      });
      urls.set(foto.campanaId, lista);
    }
    return urls;
  }

  private async aDtos(campanas: Campana[]): Promise<CampanaAdminDto[]> {
    const urls = await this.urlsDeFotos(campanas.map((campana) => campana.id));
    return campanas.map((campana) =>
      this.aDto(campana, urls.get(campana.id) ?? []),
    );
  }

  /** Ejecuta una escritura atómica (campaña + auditoría) y traduce errores. */
  private async ejecutar<T>(
    mensajeFallo: string,
    operacion: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction('READ COMMITTED', operacion);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (this.esDatoInvalido(error)) {
        throw new BadRequestException(
          'Los datos de la campaña no cumplen las reglas de publicación',
        );
      }
      throw new ServiceUnavailableException(mensajeFallo);
    }
  }

  private async auditar(
    auditorias: Repository<Auditoria>,
    datos: Pick<
      Auditoria,
      | 'administradorId'
      | 'registroId'
      | 'accion'
      | 'camposModificados'
      | 'datosAntes'
      | 'datosDespues'
    >,
  ): Promise<void> {
    await auditorias.save(auditorias.create({ tabla: TABLA, ...datos }));
  }

  private camposEditables(entrada: GuardarCampanaDto) {
    return {
      tituloEs: entrada.tituloEs,
      tituloEn: entrada.tituloEn ?? null,
      descripcionEs: entrada.descripcionEs ?? null,
      descripcionEn: entrada.descripcionEn ?? null,
      lugar: entrada.lugar ?? null,
      fecha: entrada.fecha ?? null,
      estado: entrada.estado,
      ...(entrada.perrosMachos !== undefined && {
        perrosMachos: entrada.perrosMachos,
      }),
      ...(entrada.perrosHembras !== undefined && {
        perrosHembras: entrada.perrosHembras,
      }),
      ...(entrada.gatosMachos !== undefined && {
        gatosMachos: entrada.gatosMachos,
      }),
      ...(entrada.gatosHembras !== undefined && {
        gatosHembras: entrada.gatosHembras,
      }),
    };
  }

  private aDto(
    campana: Campana,
    fotos: FotoCampanaAdminDto[] = [],
  ): CampanaAdminDto {
    return {
      id: campana.id,
      tituloEs: campana.tituloEs,
      tituloEn: campana.tituloEn,
      descripcionEs: campana.descripcionEs,
      descripcionEn: campana.descripcionEn,
      lugar: campana.lugar,
      fecha: campana.fecha,
      estado: campana.estado,
      perrosMachos: campana.perrosMachos,
      perrosHembras: campana.perrosHembras,
      gatosMachos: campana.gatosMachos,
      gatosHembras: campana.gatosHembras,
      totales: this.calcularTotales(campana),
      esHistorico: campana.esHistorico,
      fotos,
      creadoEn: new Date(campana.creadoEn).toISOString(),
      actualizadoEn: new Date(campana.actualizadoEn).toISOString(),
    };
  }

  private calcularTotales(
    c: Pick<
      Campana,
      'perrosMachos' | 'perrosHembras' | 'gatosMachos' | 'gatosHembras'
    >,
  ): TotalesCampanaDto {
    return {
      perros: c.perrosMachos + c.perrosHembras,
      gatos: c.gatosMachos + c.gatosHembras,
      machos: c.perrosMachos + c.gatosMachos,
      hembras: c.perrosHembras + c.gatosHembras,
      total: c.perrosMachos + c.perrosHembras + c.gatosMachos + c.gatosHembras,
    };
  }

  private aSnapshot(campana: Campana): Record<string, unknown> {
    return {
      id: campana.id,
      titulo_es: campana.tituloEs,
      titulo_en: campana.tituloEn,
      descripcion_es: campana.descripcionEs,
      descripcion_en: campana.descripcionEn,
      lugar: campana.lugar,
      fecha: campana.fecha,
      estado: campana.estado,
      perros_machos: campana.perrosMachos,
      perros_hembras: campana.perrosHembras,
      gatos_machos: campana.gatosMachos,
      gatos_hembras: campana.gatosHembras,
      es_historico: campana.esHistorico,
      creado_por: campana.creadoPorId,
      actualizado_por: campana.actualizadoPorId,
    };
  }

  private esDatoInvalido(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const codigo = (error.driverError as { code?: string }).code;
    return codigo !== undefined && CODIGOS_DATOS_INVALIDOS.has(codigo);
  }
}
