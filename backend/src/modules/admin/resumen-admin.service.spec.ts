import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ResumenAdminService } from './resumen-admin.service.js';

function servicioCon(respuestas: unknown[][]) {
  const query = vi.fn();
  respuestas.forEach((respuesta) => query.mockResolvedValueOnce(respuesta));
  return {
    query,
    servicio: new ResumenAdminService({ query } as unknown as DataSource),
  };
}

describe('ResumenAdminService', () => {
  it('arma el resumen con números, aunque PostgreSQL devuelva texto', async () => {
    const { servicio } = servicioCon([
      [{ total: '310', jornadas: '4' }],
      [
        {
          registrados: '8',
          en_fundacion: '4',
          adopciones_anio: '4',
          anio: '2026',
          dias_hasta_adoptar: '196',
        },
      ],
      [
        { anio: '2025', mes: '12', ingresos: '1', adopciones: '0' },
        { anio: '2026', mes: '1', ingresos: '2', adopciones: '1' },
      ],
      [{ id: 'a1', nombre: 'Pelusa', especie: 'gato', dias: '215' }],
    ]);

    await expect(servicio.obtener()).resolves.toEqual({
      esterilizaciones: { total: 310, jornadas: 4 },
      enLaFundacion: { cantidad: 4, registrados: 8 },
      adopcionesDelAnio: { cantidad: 4, anio: 2026 },
      diasHastaAdoptar: 196,
      serie: [
        { anio: 2025, mes: 12, ingresos: 1, adopciones: 0 },
        { anio: 2026, mes: 1, ingresos: 2, adopciones: 1 },
      ],
      espera: [{ id: 'a1', nombre: 'Pelusa', especie: 'gato', dias: 215 }],
    });
  });

  it('devuelve días nulos cuando ningún animal tiene ingreso y adopción', async () => {
    const { servicio } = servicioCon([
      [{ total: 0, jornadas: 0 }],
      [
        {
          registrados: 0,
          en_fundacion: 0,
          adopciones_anio: 0,
          anio: 2026,
          dias_hasta_adoptar: null,
        },
      ],
      [],
      [],
    ]);

    const resumen = await servicio.obtener();

    expect(resumen.diasHastaAdoptar).toBeNull();
    expect(resumen.espera).toEqual([]);
    expect(resumen.serie).toEqual([]);
  });

  it('consulta animales sin eliminar y la espera con un máximo de 4', async () => {
    const { servicio, query } = servicioCon([
      [{ total: 0, jornadas: 0 }],
      [{ registrados: 0, en_fundacion: 0, adopciones_anio: 0, anio: 2026, dias_hasta_adoptar: null }],
      [],
      [],
    ]);

    await servicio.obtener();

    const consultas = query.mock.calls.map(([sql]) => String(sql));
    const deAnimales = consultas.filter((sql) => sql.includes('public.animales'));
    expect(deAnimales.length).toBeGreaterThan(0);
    expect(deAnimales.every((sql) => sql.includes('eliminado_en is null'))).toBe(true);
    expect(consultas.some((sql) => sql.includes('limit 4'))).toBe(true);
  });

  it('no expone detalles de PostgreSQL si falla', async () => {
    const query = vi.fn().mockRejectedValue(new Error('host secreto'));
    const servicio = new ResumenAdminService({ query } as unknown as DataSource);

    await expect(servicio.obtener()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
