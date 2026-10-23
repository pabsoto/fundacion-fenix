import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CampanaPublicaDto } from './dto/campana-publica.dto.js';
import { EstadisticasPublicasDto } from './dto/estadisticas-publicas.dto.js';

interface CampanaFila {
  id: string;
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
    try {
      const parametros: unknown[] = [];
      const filtroAnio = anio
        ? `and extract(year from resumen.fecha)::int = $${parametros.push(anio)}`
        : '';
      const filas = await this.dataSource.query<CampanaFila[]>(
        `select resumen.id,
                coalesce(resumen.lugar, resumen.titulo_es) as lugar,
                resumen.fecha::text as fecha,
                resumen.total_perros,
                resumen.total_gatos,
                resumen.total_machos,
                resumen.total_hembras,
                resumen.total_esterilizaciones,
                coalesce(
                  array_agg(foto.ruta_archivo order by foto.orden)
                    filter (where foto.id is not null),
                  array[]::text[]
                ) as fotos
           from public.v_campanas_resumen resumen
           left join public.campana_fotos foto on foto.campana_id = resumen.id
          where resumen.estado = 'realizada'
            and resumen.fecha is not null
            ${filtroAnio}
          group by resumen.id, resumen.lugar, resumen.titulo_es, resumen.fecha,
                   resumen.total_perros, resumen.total_gatos, resumen.total_machos,
                   resumen.total_hembras, resumen.total_esterilizaciones
          order by resumen.fecha desc, resumen.id`,
        parametros,
      );

      return filas.map((fila) => ({
        id: fila.id,
        lugar: fila.lugar ?? '',
        fecha: fila.fecha,
        perros: Number(fila.total_perros),
        gatos: Number(fila.total_gatos),
        machos: Number(fila.total_machos),
        hembras: Number(fila.total_hembras),
        total: Number(fila.total_esterilizaciones),
        fotos: fila.fotos ?? [],
      }));
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }
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
