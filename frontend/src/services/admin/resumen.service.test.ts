import { describe, expect, it, vi } from 'vitest';
import { ANIMALES_EJEMPLO, CAMPANAS_EJEMPLO } from '@/services/admin/demo/datos-ejemplo';
import { calcularResumen, getResumen } from '@/services/admin/resumen.service';
import type { Animal } from '@/types/admin';

// DEMO: getResumen se prueba con las listas simuladas.
vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

const HOY = new Date(2026, 10, 10);

describe('calcularResumen', () => {
  it('suma campañas y cuenta animales con la fecha de hoy', () => {
    const resumen = calcularResumen(CAMPANAS_EJEMPLO, ANIMALES_EJEMPLO, HOY);

    expect(resumen.esterilizaciones).toEqual({ total: 310, jornadas: 4 });
    expect(resumen.enLaFundacion).toEqual({ cantidad: 4, registrados: 8 });
    expect(resumen.adopcionesDelAnio).toEqual({ cantidad: 4, anio: 2026 });
    expect(resumen.diasHastaAdoptar).toBe(196);
    expect(resumen.espera.map((animal) => [animal.nombre, animal.dias])).toEqual([
      ['Pelusa', 215],
      ['Apolo', 169],
      ['Mishi', 98],
      ['Toby', 42],
    ]);
    expect(resumen.serie).toEqual([
      { anio: 2025, mes: 12, ingresos: 1, adopciones: 0 },
      { anio: 2026, mes: 1, ingresos: 0, adopciones: 1 },
      { anio: 2026, mes: 2, ingresos: 1, adopciones: 0 },
      { anio: 2026, mes: 3, ingresos: 1, adopciones: 0 },
      { anio: 2026, mes: 4, ingresos: 1, adopciones: 1 },
      { anio: 2026, mes: 5, ingresos: 1, adopciones: 0 },
      { anio: 2026, mes: 6, ingresos: 0, adopciones: 0 },
      { anio: 2026, mes: 7, ingresos: 0, adopciones: 1 },
      { anio: 2026, mes: 8, ingresos: 1, adopciones: 0 },
      { anio: 2026, mes: 9, ingresos: 1, adopciones: 0 },
      { anio: 2026, mes: 10, ingresos: 0, adopciones: 1 },
      { anio: 2026, mes: 11, ingresos: 0, adopciones: 0 },
    ]);
  });

  it('deja fuera al animal sin fecha de ingreso y muestra vacío si no hay datos', () => {
    const sinIngreso: Animal = {
      ...ANIMALES_EJEMPLO[0],
      id: 'sin-ingreso',
      nombre: 'Nube',
      fechaIngreso: null,
      fechaAdopcion: '2026-11-01',
      adoptadoPor: 'Ana',
    };

    const resumen = calcularResumen([], [sinIngreso], HOY);

    expect(resumen.esterilizaciones).toEqual({ total: 0, jornadas: 0 });
    expect(resumen.enLaFundacion).toEqual({ cantidad: 0, registrados: 1 });
    expect(resumen.adopcionesDelAnio).toEqual({ cantidad: 1, anio: 2026 });
    expect(resumen.diasHastaAdoptar).toBeNull();
    expect(resumen.espera).toEqual([]);
    expect(resumen.serie.every((punto) => punto.ingresos === 0 && punto.adopciones === 0)).toBe(true);
    expect(resumen.serie).toHaveLength(12);
  });
});

describe('getResumen', () => {
  it('calcula el total de esterilizaciones con las listas', async () => {
    const resumen = await getResumen();
    expect(resumen.esterilizaciones).toEqual({ total: 310, jornadas: 4 });
    expect(resumen.enLaFundacion.registrados).toBe(8);
    expect(resumen.serie).toHaveLength(12);
  });
});
