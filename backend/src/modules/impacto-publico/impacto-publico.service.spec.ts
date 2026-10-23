import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ImpactoPublicoService } from './impacto-publico.service.js';

describe('ImpactoPublicoService', () => {
  it('mapea campañas realizadas sin inventar datos', async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: '11111111-1111-1111-1111-111111111111',
        lugar: 'Villa Esperanza',
        fecha: '2026-05-10',
        total_perros: 8,
        total_gatos: 4,
        total_machos: 5,
        total_hembras: 7,
        total_esterilizaciones: 12,
        fotos: ['/images/campana.webp'],
      },
    ]);
    const service = new ImpactoPublicoService({ query } as unknown as DataSource);

    await expect(service.listarCampanas(2026)).resolves.toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        lugar: 'Villa Esperanza',
        fecha: '2026-05-10',
        perros: 8,
        gatos: 4,
        machos: 5,
        hembras: 7,
        total: 12,
        fotos: ['/images/campana.webp'],
      },
    ]);
    expect(query.mock.calls[0][1]).toEqual([2026]);
  });

  it('devuelve estadísticas en cero cuando la vista no contiene una fila', async () => {
    const service = new ImpactoPublicoService({
      query: vi.fn().mockResolvedValue([]),
    } as unknown as DataSource);

    await expect(service.obtenerEstadisticas()).resolves.toEqual({
      caninos: { total: 0, machos: 0, hembras: 0 },
      felinos: { total: 0, machos: 0, hembras: 0 },
    });
  });

  it('no filtra detalles de errores de PostgreSQL', async () => {
    const service = new ImpactoPublicoService({
      query: vi.fn().mockRejectedValue(new Error('host secreto')),
    } as unknown as DataSource);

    await expect(service.listarCampanas()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
