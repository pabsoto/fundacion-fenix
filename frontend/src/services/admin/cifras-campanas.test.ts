import { describe, expect, it } from 'vitest';
import { cifrasDePeriodo, type CampanaCifras } from '@/services/admin/cifras-campanas';

function jornada(
  fecha: string | null,
  perrosMachos: number,
  perrosHembras: number,
  gatosMachos: number,
  gatosHembras: number,
): CampanaCifras {
  return { fecha, perrosMachos, perrosHembras, gatosMachos, gatosHembras };
}

const LISTA: CampanaCifras[] = [
  jornada('2026-03-08', 1, 2, 3, 4),
  jornada('2026-03-20', 10, 0, 0, 5),
  jornada('2026-07-01', 4, 4, 1, 1),
  jornada('2025-03-08', 7, 0, 0, 0),
  jornada(null, 9, 0, 0, 0),
];

const CEROS = { perros: 0, gatos: 0, machos: 0, hembras: 0, total: 0 };

describe('cifrasDePeriodo', () => {
  it('suma un mes con datos y deja fuera el resto', () => {
    const resultado = cifrasDePeriodo(LISTA, { anio: 2026, mes: 3 });

    expect(resultado.campanas.map((campana) => campana.fecha)).toEqual(['2026-03-08', '2026-03-20']);
    expect(resultado.contadores).toEqual({
      perrosMachos: 11,
      perrosHembras: 2,
      gatosMachos: 3,
      gatosHembras: 9,
    });
    expect(resultado.totales).toEqual({
      perros: 13,
      gatos: 12,
      machos: 14,
      hembras: 11,
      total: 25,
    });
  });

  it('devuelve totales en cero cuando el mes no tiene campañas', () => {
    const resultado = cifrasDePeriodo(LISTA, { anio: 2026, mes: 1 });

    expect(resultado.campanas).toEqual([]);
    expect(resultado.contadores).toEqual({
      perrosMachos: 0,
      perrosHembras: 0,
      gatosMachos: 0,
      gatosHembras: 0,
    });
    expect(resultado.totales).toEqual(CEROS);
  });

  it('suma el año completo sin campañas de otro año ni sin fecha', () => {
    const resultado = cifrasDePeriodo(LISTA, { anio: 2026, mes: null });

    expect(resultado.campanas).toHaveLength(3);
    expect(resultado.totales).toEqual({
      perros: 21,
      gatos: 14,
      machos: 19,
      hembras: 16,
      total: 35,
    });
  });

  it('incluye las campañas sin fecha solo en Todos', () => {
    const todas = cifrasDePeriodo(LISTA, { anio: null, mes: null });
    const sinFecha = todas.campanas.filter((campana) => campana.fecha === null);

    expect(sinFecha).toEqual([jornada(null, 9, 0, 0, 0)]);
    expect(todas.totales.total).toBe(35 + 7 + 9);

    expect(cifrasDePeriodo(LISTA, { anio: 2026, mes: null }).campanas.some((c) => !c.fecha)).toBe(
      false,
    );
    expect(cifrasDePeriodo(LISTA, { anio: null, mes: 3 }).campanas.some((c) => !c.fecha)).toBe(
      false,
    );
    expect(cifrasDePeriodo(LISTA, { anio: 2026, mes: 3 }).campanas.some((c) => !c.fecha)).toBe(
      false,
    );
  });
});
