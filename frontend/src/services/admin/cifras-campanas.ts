import { totalesDe, type ContadoresCampana, type TotalesCampana } from '@/types/admin';

/**
 * Periodo del filtro de campañas.
 * `anio` null es «Todos» y `mes` null es «Todos los meses».
 *
 * TODO(backend): al integrar, sustituir esta función por
 * GET /api/admin/campanas/cifras?anio=&mes=. Ese endpoint exige `anio`
 * y no incluye las campañas sin fecha ni en el año completo.
 */
export type PeriodoCampanas = {
  anio: number | null;
  mes: number | null;
};

export type CampanaCifras = ContadoresCampana & {
  fecha: string | null;
};

export type CifrasPeriodo<T extends CampanaCifras> = {
  campanas: T[];
  contadores: ContadoresCampana;
  totales: TotalesCampana;
};

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function partesFecha(fecha: string | null): { anio: number; mes: number } | null {
  if (!fecha) return null;
  const coincidencia = FECHA.exec(fecha);
  if (!coincidencia) return null;
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const valor = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    valor.getUTCFullYear() !== anio ||
    valor.getUTCMonth() !== mes - 1 ||
    valor.getUTCDate() !== dia
  ) {
    return null;
  }
  return { anio, mes };
}

/** Años presentes en campañas con fecha válida, del más reciente al más antiguo. */
export function aniosDeCampanas(campanas: readonly { fecha: string | null }[]): number[] {
  const anios = new Set<number>();
  for (const campana of campanas) {
    const partes = partesFecha(campana.fecha);
    if (partes) anios.add(partes.anio);
  }
  return [...anios].sort((a, b) => b - a);
}

function esTodos(periodo: PeriodoCampanas): boolean {
  return periodo.anio === null && periodo.mes === null;
}

function entraEnPeriodo(fecha: string | null, periodo: PeriodoCampanas): boolean {
  const partes = partesFecha(fecha);
  if (!partes) return esTodos(periodo);
  if (periodo.anio !== null && partes.anio !== periodo.anio) return false;
  if (periodo.mes !== null && partes.mes !== periodo.mes) return false;
  return true;
}

function sumarContadores(lista: readonly ContadoresCampana[]): ContadoresCampana {
  return lista.reduce(
    (total, campana) => ({
      perrosMachos: total.perrosMachos + campana.perrosMachos,
      perrosHembras: total.perrosHembras + campana.perrosHembras,
      gatosMachos: total.gatosMachos + campana.gatosMachos,
      gatosHembras: total.gatosHembras + campana.gatosHembras,
    }),
    { perrosMachos: 0, perrosHembras: 0, gatosMachos: 0, gatosHembras: 0 },
  );
}

/** Filtra por fecha y suma perros, gatos, machos, hembras y el total. */
export function cifrasDePeriodo<T extends CampanaCifras>(
  campanas: readonly T[],
  periodo: PeriodoCampanas,
): CifrasPeriodo<T> {
  const incluidas = campanas.filter((campana) => entraEnPeriodo(campana.fecha, periodo));
  const contadores = sumarContadores(incluidas);
  return { campanas: incluidas, contadores, totales: totalesDe(contadores) };
}
