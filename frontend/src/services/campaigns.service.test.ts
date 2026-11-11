import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Campaign } from '@/types';
import { ordenarCampanas } from './campaigns.service';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

function campana(id: string, fecha: string): Campaign {
  const [anio, mes] = fecha.split('-').map(Number);
  return {
    id,
    place: id,
    year: anio,
    months: [mes],
    fecha,
    total: 1,
    dogs: 1,
    cats: 0,
    males: 1,
    females: 0,
    photos: [],
  };
}

describe('ordenarCampanas', () => {
  it('ordena por fecha descendente aunque los datos lleguen desordenados', () => {
    const orden = ordenarCampanas([
      campana('achumani', '2025-01-01'),
      { ...campana('sin-fecha', '2024-01-01'), fecha: null },
      campana('satelite', '2024-06-01'),
      campana('villa', '2025-03-01'),
      campana('obrajes', '2024-09-01'),
    ]).map((campaign) => campaign.id);

    expect(orden).toEqual(['villa', 'achumani', 'obrajes', 'satelite', 'sin-fecha']);
  });
});

describe('getCampaigns', () => {
  it('no copia estado, autores ni es_historico y conserva el orden por fecha', async () => {
    vi.stubEnv('VITE_DEMO_SHOWCASE', 'false');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const cuerpo = [
          {
            id: '22222222-2222-4222-8222-222222222222',
            lugar: 'Achumani',
            fecha: null,
            perros: 1,
            gatos: 0,
            machos: 1,
            hembras: 0,
            total: 1,
            fotos: [],
            tituloEs: 'Achumani',
            tituloEn: null,
            descripcionEs: null,
            descripcionEn: null,
            estado: 'cerrada',
            es_historico: true,
            esHistorico: true,
            creado_por: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            actualizado_por: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          },
          {
            id: '11111111-1111-4111-8111-111111111111',
            lugar: 'Villa Adela',
            fecha: '2025-03-01',
            perros: 2,
            gatos: 1,
            machos: 1,
            hembras: 2,
            total: 3,
            fotos: ['campanas/villa/1.webp'],
            tituloEs: 'Villa Adela',
            tituloEn: 'Villa Adela drive',
            descripcionEs: 'Jornada',
            descripcionEn: null,
            estado: 'publicada',
            es_historico: false,
            creado_por: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            actualizado_por: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          },
        ];
        return new Response(JSON.stringify(cuerpo), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    const { getCampaigns } = await import('./campaigns.service');
    const campaigns = await getCampaigns();

    expect(campaigns.map((campaign) => campaign.id)).toEqual([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(campaigns[0]).toMatchObject({
      place: 'Villa Adela',
      fecha: '2025-03-01',
      year: 2025,
      months: [3],
      tituloEs: 'Villa Adela',
      tituloEn: 'Villa Adela drive',
    });
    expect(campaigns[1].fecha).toBeNull();

    const serializado = JSON.stringify(campaigns);
    for (const campo of [
      'estado',
      'es_historico',
      'esHistorico',
      'creado_por',
      'actualizado_por',
      'creadoPor',
      'actualizadoPor',
    ]) {
      expect(campaigns[0]).not.toHaveProperty(campo);
      expect(campaigns[1]).not.toHaveProperty(campo);
    }
    expect(serializado).not.toContain('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(serializado).not.toContain('publicada');
    expect(serializado).not.toContain('cerrada');
  });
});
