import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service.js';
import { ImpactoPublicoService } from './impacto-publico.service.js';

describe('ImpactoPublicoService', () => {
  const filaCampana = {
    id: '11111111-1111-1111-1111-111111111111',
    titulo_es: 'Campaña Villa Esperanza',
    titulo_en: 'Villa Esperanza campaign',
    descripcion_es: 'Esterilización gratuita.',
    descripcion_en: null,
    lugar: 'Villa Esperanza',
    fecha: '2026-05-10',
    total_perros: 8,
    total_gatos: 4,
    total_machos: 5,
    total_hembras: 7,
    total_esterilizaciones: '12',
    fotos: ['campanas/villa-esperanza/1.webp'],
  };

  const obtenerUrlPublica = vi.fn((ruta: string) => `https://cdn.test/${ruta}`);

  const crearServicio = (query = vi.fn().mockResolvedValue([filaCampana])) => ({
    query,
    service: new ImpactoPublicoService(
      { query } as unknown as DataSource,
      { obtenerUrlPublica } as unknown as StorageService,
    ),
  });

  it('mapea campañas visibles con textos bilingües sin inventar datos', async () => {
    const { service, query } = crearServicio();

    await expect(service.listarCampanas(2026)).resolves.toEqual([
      {
        id: '11111111-1111-1111-1111-111111111111',
        tituloEs: 'Campaña Villa Esperanza',
        tituloEn: 'Villa Esperanza campaign',
        descripcionEs: 'Esterilización gratuita.',
        descripcionEn: null,
        lugar: 'Villa Esperanza',
        fecha: '2026-05-10',
        perros: 8,
        gatos: 4,
        machos: 5,
        hembras: 7,
        total: 12,
        fotos: ['https://cdn.test/campanas/villa-esperanza/1.webp'],
      },
    ]);
    expect(query.mock.calls[0][1]).toEqual([2026]);
  });

  it('filtra por estado en la tabla campanas: publicadas o cerradas, nunca borradores', async () => {
    const { service, query } = crearServicio(vi.fn().mockResolvedValue([]));

    await service.listarCampanas();

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("campana.estado in ('publicada', 'cerrada')");
    expect(sql).toContain('campana.fecha is not null');
    expect(sql).not.toContain('borrador');
    expect(query.mock.calls[0][1]).toEqual([]);
  });

  it('lee las fotos de fotos_campana, la tabla donde las guarda el panel', async () => {
    const { service, query } = crearServicio(vi.fn().mockResolvedValue([]));

    await service.listarCampanas();

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('public.fotos_campana');
    expect(sql).not.toContain('campana_fotos');
  });

  it('sigue mostrando la campaña, sin fotos, si Storage no responde', async () => {
    obtenerUrlPublica.mockImplementationOnce(() => {
      throw new Error('Storage no configurado');
    });
    const { service } = crearServicio();

    const [campana] = await service.listarCampanas();

    expect(campana.id).toBe(filaCampana.id);
    expect(campana.fotos).toEqual([]);
  });

  it('no selecciona columnas administrativas', async () => {
    const { service, query } = crearServicio(vi.fn().mockResolvedValue([]));

    await service.listarCampanas();

    const sql = String(query.mock.calls[0][0]);
    for (const columna of [
      'creado_por',
      'actualizado_por',
      'creado_en',
      'actualizado_en',
      'es_historico',
      'campana.*',
      'resumen.*',
    ]) {
      expect(sql).not.toContain(columna);
    }
  });

  it('descarta columnas no previstas aunque la consulta las devuelva', async () => {
    const { service } = crearServicio(
      vi.fn().mockResolvedValue([
        {
          ...filaCampana,
          estado: 'publicada',
          creado_por: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          es_historico: true,
        },
      ]),
    );

    const [campana] = await service.listarCampanas();

    expect(Object.keys(campana).sort()).toEqual(
      [
        'id',
        'tituloEs',
        'tituloEn',
        'descripcionEs',
        'descripcionEn',
        'lugar',
        'fecha',
        'perros',
        'gatos',
        'machos',
        'hembras',
        'total',
        'fotos',
      ].sort(),
    );
  });

  it('obtiene una campaña visible por id con el mismo filtro de visibilidad', async () => {
    const { service, query } = crearServicio();

    await expect(service.obtenerCampana(filaCampana.id)).resolves.toMatchObject(
      {
        id: filaCampana.id,
        tituloEs: 'Campaña Villa Esperanza',
      },
    );
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("campana.estado in ('publicada', 'cerrada')");
    expect(sql).toContain('campana.id = $1');
    expect(query.mock.calls[0][1]).toEqual([filaCampana.id]);
  });

  it('responde 404 si la campaña no existe o no es visible', async () => {
    const { service } = crearServicio(vi.fn().mockResolvedValue([]));

    await expect(service.obtenerCampana(filaCampana.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('devuelve estadísticas en cero cuando la vista no contiene una fila', async () => {
    const service = new ImpactoPublicoService(
      { query: vi.fn().mockResolvedValue([]) } as unknown as DataSource,
      { obtenerUrlPublica } as unknown as StorageService,
    );

    await expect(service.obtenerEstadisticas()).resolves.toEqual({
      caninos: { total: 0, machos: 0, hembras: 0 },
      felinos: { total: 0, machos: 0, hembras: 0 },
    });
  });

  it('no filtra detalles de errores de PostgreSQL', async () => {
    const service = new ImpactoPublicoService(
      {
        query: vi.fn().mockRejectedValue(new Error('host secreto')),
      } as unknown as DataSource,
      { obtenerUrlPublica } as unknown as StorageService,
    );

    await expect(service.listarCampanas()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(
      service.obtenerCampana('11111111-1111-1111-1111-111111111111'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
