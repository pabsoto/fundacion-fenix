import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResumenAdminDto } from './dto/resumen-admin.dto.js';

/** El panel se usa en Bolivia: «hoy» y «este mes» siguen esa zona horaria. */
const HOY = `(now() at time zone 'America/La_Paz')::date`;

const MESES_SERIE = 12;
const MAXIMO_EN_ESPERA = 4;

interface FilaCampanas {
  total: number | string;
  jornadas: number | string;
}

interface FilaAnimales {
  registrados: number | string;
  en_fundacion: number | string;
  adopciones_anio: number | string;
  anio: number | string;
  dias_hasta_adoptar: number | string | null;
}

interface FilaSerie {
  anio: number | string;
  mes: number | string;
  ingresos: number | string;
  adopciones: number | string;
}

interface FilaEspera {
  id: string;
  nombre: string;
  especie: string;
  dias: number | string;
}

/**
 * Cifras de la pantalla de inicio del panel. Se calculan en la base de datos
 * para no traer al navegador todas las campañas y animales.
 */
@Injectable()
export class ResumenAdminService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async obtener(): Promise<ResumenAdminDto> {
    try {
      const [campanas, animales, serie, espera] = await Promise.all([
        this.dataSource.query<FilaCampanas[]>(
          `select coalesce(sum(perros_machos + perros_hembras + gatos_machos + gatos_hembras), 0)::int as total,
                  count(*)::int as jornadas
             from public.campanas`,
        ),
        this.dataSource.query<FilaAnimales[]>(
          `select count(*)::int as registrados,
                  (count(*) filter (where not adoptado))::int as en_fundacion,
                  (count(*) filter (
                     where fecha_adopcion is not null
                       and extract(year from fecha_adopcion) = extract(year from ${HOY})
                  ))::int as adopciones_anio,
                  extract(year from ${HOY})::int as anio,
                  round(avg(fecha_adopcion - fecha_ingreso) filter (
                    where fecha_adopcion is not null and fecha_ingreso is not null
                  ))::int as dias_hasta_adoptar
             from public.animales
            where eliminado_en is null`,
        ),
        this.dataSource.query<FilaSerie[]>(
          `with meses as (
             select generate_series(
                      date_trunc('month', ${HOY}::timestamp) - interval '${MESES_SERIE - 1} months',
                      date_trunc('month', ${HOY}::timestamp),
                      interval '1 month'
                    )::date as mes
           )
           select extract(year from m.mes)::int as anio,
                  extract(month from m.mes)::int as mes,
                  (select count(*) from public.animales a
                    where a.eliminado_en is null
                      and date_trunc('month', a.fecha_ingreso::timestamp)::date = m.mes)::int as ingresos,
                  (select count(*) from public.animales a
                    where a.eliminado_en is null
                      and date_trunc('month', a.fecha_adopcion::timestamp)::date = m.mes)::int as adopciones
             from meses m
            order by m.mes`,
        ),
        this.dataSource.query<FilaEspera[]>(
          `select a.id, a.nombre, a.especie,
                  (${HOY} - a.fecha_ingreso)::int as dias
             from public.animales a
            where a.eliminado_en is null
              and not a.adoptado
              and a.fecha_ingreso is not null
            order by a.fecha_ingreso asc, a.nombre asc
            limit ${MAXIMO_EN_ESPERA}`,
        ),
      ]);

      const resumenCampanas = campanas[0];
      const resumenAnimales = animales[0];

      return {
        esterilizaciones: {
          total: Number(resumenCampanas?.total ?? 0),
          jornadas: Number(resumenCampanas?.jornadas ?? 0),
        },
        enLaFundacion: {
          cantidad: Number(resumenAnimales?.en_fundacion ?? 0),
          registrados: Number(resumenAnimales?.registrados ?? 0),
        },
        adopcionesDelAnio: {
          cantidad: Number(resumenAnimales?.adopciones_anio ?? 0),
          anio: Number(resumenAnimales?.anio ?? new Date().getFullYear()),
        },
        diasHastaAdoptar:
          resumenAnimales?.dias_hasta_adoptar == null
            ? null
            : Number(resumenAnimales.dias_hasta_adoptar),
        serie: serie.map((fila) => ({
          anio: Number(fila.anio),
          mes: Number(fila.mes),
          ingresos: Number(fila.ingresos),
          adopciones: Number(fila.adopciones),
        })),
        espera: espera.map((fila) => ({
          id: fila.id,
          nombre: fila.nombre,
          especie: fila.especie,
          dias: Number(fila.dias),
        })),
      };
    } catch {
      throw new ServiceUnavailableException(
        'El resumen no está disponible temporalmente',
      );
    }
  }
}
