import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { CampanaAdminDto, TotalesCampanaDto } from './dto/campana-admin.dto.js';
import {
  CifrasPeriodoDto,
  ConsultaCifrasDto,
} from './dto/consulta-cifras.dto.js';
import { GuardarCampanaDto } from './dto/guardar-campana.dto.js';
import { Campana } from './entities/campana.entity.js';

const TABLA = 'campanas';

const CODIGOS_DATOS_INVALIDOS = new Set([
  '23514', // check_violation
  '22007', // invalid_datetime_format
  '22008', // datetime_field_overflow
]);

@Injectable()
export class CampanasAdminService {
  constructor(
    @InjectRepository(Campana)
    private readonly repositorio: Repository<Campana>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<CampanaAdminDto[]> {
    try {
      const campanas = await this.repositorio.find({
        order: {
          fecha: { direction: 'DESC', nulls: 'LAST' },
          creadoEn: 'DESC',
        },
      });
      return campanas.map((campana) => this.aDto(campana));
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
    try {
      campanas = await this.repositorio.find({
        where: { fecha: Between(desde, hasta), ...(estado && { estado }) },
        order: { fecha: 'ASC', creadoEn: 'ASC' },
      });
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
      campanas: campanas.map((campana) => this.aDto(campana)),
    };
  }

  async obtener(id: string): Promise<CampanaAdminDto> {
    let campana: Campana | null;
    try {
      campana = await this.repositorio.findOne({ where: { id } });
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }
    if (!campana) throw new NotFoundException('La campaña no existe');
    return this.aDto(campana);
  }

  async crear(
    entrada: GuardarCampanaDto,
    administradorId: string,
  ): Promise<CampanaAdminDto> {
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
    return this.ejecutar(
      'No fue posible actualizar la campaña',
      async (manager) => {
        const campanas = manager.getRepository(Campana);
        const existente = await campanas.findOne({
          where: { id },
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
        return this.aDto(guardada);
      },
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

  private aDto(campana: Campana): CampanaAdminDto {
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
