import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { EstadoCampana } from '../campanas/entities/campana.entity.js';
import { CampanaPublicaDto } from './dto/campana-publica.dto.js';
import { EstadisticasPublicasDto } from './dto/estadisticas-publicas.dto.js';

export const ESTADOS_CAMPANA_PUBLICOS = [
  'publicada',
  'cerrada',
] as const satisfies readonly EstadoCampana[];

const ESTADOS_PUBLICOS_SQL = ESTADOS_CAMPANA_PUBLICOS.map(
  (estado) => `'${estado}'`,
).join(', ');

interface CampanaFila {
  id: string;
  titulo_es: string;
  titulo_en: string | null;
  descripcion_es: string | null;
  descripcion_en: string | null;
  lugar: string | null;
  fecha: string;
  total_perros: number;
  total_gatos: number;
  total_machos: number;
  total_hembras: number;
  total_esterilizaciones: number;
  fotos: string[] | null;
}

interface EstadisticasFila {
  perros_machos: number;
  perros_hembras: number;
  gatos_machos: number;
  gatos_hembras: number;
  total_perros: number;
  total_gatos: number;
}

@Injectable()
export class ImpactoPublicoService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listarCampanas(anio?: number): Promise<CampanaPublicaDto[]> {
    const parametros: unknown[] = [];
    const filtro =
      anio === undefined
        ? ''
        : `and extract(year from campana.fecha)::int = $${parametros.push(anio)}`;
    const filas = await this.consultarCampanas(filtro, parametros);
    return filas.map((fila) => this.aDto(fila));
  }

  
  async obtenerCampana(id: string): Promise<CampanaPublicaDto> {
    const filas = await this.consultarCampanas('and campana.id = $1', [id]);
    const fila = filas[0];
    if (!fila) throw new NotFoundException('La campaña no existe');
    return this.aDto(fila);
  }

  private async consultarCampanas(
    filtroAdicional: string,
    parametros: unknown[],
  ): Promise<CampanaFila[]> {
    try {
      return await this.dataSource.query<CampanaFila[]>(
        `select campana.id,
                campana.titulo_es,
                campana.titulo_en,
                campana.descripcion_es,
                campana.descripcion_en,
                coalesce(campana.lugar, campana.titulo_es) as lugar,
                campana.fecha::text as fecha,
                resumen.total_perros,
                resumen.total_gatos,
                resumen.total_machos,
                resumen.total_hembras,
                resumen.total_esterilizaciones,
                coalesce(
                  (select array_agg(foto.ruta_archivo order by foto.orden)
                     from public.campana_fotos foto
                    where foto.campana_id = campana.id),
                  array[]::text[]
                ) as fotos
           from public.campanas campana
           join public.v_campanas_resumen resumen on resumen.id = campana.id
          where campana.estado in (${ESTADOS_PUBLICOS_SQL})
            and campana.fecha is not null
            ${filtroAdicional}
          order by campana.fecha desc, campana.id`,
        parametros,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }
  }

  private aDto(fila: CampanaFila): CampanaPublicaDto {
    return {
      id: fila.id,
      tituloEs: fila.titulo_es,
      tituloEn: fila.titulo_en,
      descripcionEs: fila.descripcion_es,
      descripcionEn: fila.descripcion_en,
      lugar: fila.lugar ?? '',
      fecha: fila.fecha,
      perros: Number(fila.total_perros),
      gatos: Number(fila.total_gatos),
      machos: Number(fila.total_machos),
      hembras: Number(fila.total_hembras),
      total: Number(fila.total_esterilizaciones),
      fotos: fila.fotos ?? [],
    };
  }

  async obtenerEstadisticas(): Promise<EstadisticasPublicasDto> {
    try {
      const filas = await this.dataSource.query<EstadisticasFila[]>(
        `select perros_machos, perros_hembras, gatos_machos, gatos_hembras,
                total_perros, total_gatos
           from public.v_contador_esterilizaciones`,
      );
      const fila = filas[0];

      return {
        caninos: {
          total: Number(fila?.total_perros ?? 0),
          machos: Number(fila?.perros_machos ?? 0),
          hembras: Number(fila?.perros_hembras ?? 0),
        },
        felinos: {
          total: Number(fila?.total_gatos ?? 0),
          machos: Number(fila?.gatos_machos ?? 0),
          hembras: Number(fila?.gatos_hembras ?? 0),
        },
      };
    } catch {
      throw new ServiceUnavailableException(
        'Las estadísticas no están disponibles temporalmente',
      );
    }
  }
}
