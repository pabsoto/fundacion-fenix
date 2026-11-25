import type { FiltroAnimales } from '@/types/admin';

/** Tope del texto de búsqueda que viaja en la URL. */
export const Q_MAXIMO = 100;

export const CLAVE_FILTROS_CAMPANAS = 'fenix.admin.campanas';
export const CLAVE_FILTROS_ANIMALES = 'fenix.admin.animales';

const FILTROS_ANIMALES: readonly FiltroAnimales[] = ['todos', 'adoptados', 'en-la-fundacion'];

export type FiltrosCampanasUrl = {
  anio: number | null;
  mes: number | null;
  pagina: number;
  q: string;
};

export type FiltrosAnimalesUrl = {
  filtro: FiltroAnimales;
  pagina: number;
  q: string;
};

function anioDe(valor: string | null): number | null {
  if (!valor || !/^\d{4}$/.test(valor)) return null;
  const numero = Number(valor);
  if (numero < 2000 || numero > 2100) return null;
  return numero;
}

function mesDe(valor: string | null, anio: number | null): number | null {
  if (anio === null || !valor || !/^\d{1,2}$/.test(valor)) return null;
  const numero = Number(valor);
  if (numero < 1 || numero > 12) return null;
  return numero;
}

function paginaDe(valor: string | null): number {
  if (!valor || !/^[1-9]\d*$/.test(valor)) return 1;
  return Number(valor);
}

function qDe(valor: string | null): string {
  if (!valor) return '';
  return valor.trim().slice(0, Q_MAXIMO);
}

function filtroDe(valor: string | null): FiltroAnimales {
  if (valor && FILTROS_ANIMALES.includes(valor as FiltroAnimales)) return valor as FiltroAnimales;
  return 'todos';
}

/** Lee y descarta lo que no cumple las reglas. Los inválidos vuelven al valor por defecto. */
export function leerFiltrosCampanas(params: URLSearchParams): FiltrosCampanasUrl {
  const anio = anioDe(params.get('anio'));
  return {
    anio,
    mes: mesDe(params.get('mes'), anio),
    pagina: paginaDe(params.get('pagina')),
    q: qDe(params.get('q')),
  };
}

export function leerFiltrosAnimales(params: URLSearchParams): FiltrosAnimalesUrl {
  return {
    filtro: filtroDe(params.get('filtro')),
    pagina: paginaDe(params.get('pagina')),
    q: qDe(params.get('q')),
  };
}

/** Omite los valores por defecto para que la URL quede corta. */
export function escribirFiltrosCampanas(filtros: FiltrosCampanasUrl): URLSearchParams {
  const params = new URLSearchParams();
  const anio = anioDe(filtros.anio === null ? null : String(filtros.anio));
  const mes = mesDe(filtros.mes === null ? null : String(filtros.mes), anio);
  if (anio !== null) params.set('anio', String(anio));
  if (mes !== null) params.set('mes', String(mes));
  if (filtros.pagina > 1) params.set('pagina', String(filtros.pagina));
  const q = qDe(filtros.q);
  if (q) params.set('q', q);
  return params;
}

export function escribirFiltrosAnimales(filtros: FiltrosAnimalesUrl): URLSearchParams {
  const params = new URLSearchParams();
  const filtro = filtroDe(filtros.filtro);
  if (filtro !== 'todos') params.set('filtro', filtro);
  if (filtros.pagina > 1) params.set('pagina', String(filtros.pagina));
  const q = qDe(filtros.q);
  if (q) params.set('q', q);
  return params;
}
