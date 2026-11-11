import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/config/configure-application.js';

const URL_BASE = '/api/public/campanas';
const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const CAMPOS_PUBLICOS = [
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
].sort();

/** Fila tal como existe en PostgreSQL, incluidas columnas administrativas. */
interface FilaBd {
  id: string;
  titulo_es: string;
  titulo_en: string | null;
  descripcion_es: string | null;
  descripcion_en: string | null;
  lugar: string | null;
  fecha: string | null;
  estado: 'borrador' | 'publicada' | 'cerrada';
  es_historico: boolean;
  creado_por: string;
  actualizado_por: string;
  creado_en: string;
  actualizado_en: string;
  total_perros: number;
  total_gatos: number;
  total_machos: number;
  total_hembras: number;
  total_esterilizaciones: number;
  fotos: string[];
}

function fila(cambios: Partial<FilaBd> & Pick<FilaBd, 'id'>): FilaBd {
  return {
    titulo_es: 'Campaña',
    titulo_en: null,
    descripcion_es: null,
    descripcion_en: null,
    lugar: 'El Alto',
    fecha: '2026-01-01',
    estado: 'publicada',
    es_historico: false,
    creado_por: ADMIN_ID,
    actualizado_por: ADMIN_ID,
    creado_en: '2026-01-01T00:00:00.000Z',
    actualizado_en: '2026-01-01T00:00:00.000Z',
    total_perros: 0,
    total_gatos: 0,
    total_machos: 0,
    total_hembras: 0,
    total_esterilizaciones: 0,
    fotos: [],
    ...cambios,
  };
}

const PUBLICADA = fila({
  id: '0f8b6c2e-6a43-4b8e-9f1a-2a7a8d1c4e55',
  titulo_es: 'Campaña Villa Adela',
  titulo_en: 'Villa Adela campaign',
  descripcion_es: 'Esterilización gratuita.',
  descripcion_en: 'Free spay and neuter.',
  lugar: 'Villa Adela, El Alto',
  fecha: '2026-11-21',
  estado: 'publicada',
});

const CERRADA = fila({
  id: '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d',
  titulo_es: 'Campaña Senkata',
  descripcion_es: 'Esterilización gratuita de perros y gatos en Senkata.',
  descripcion_en:
    'Free spay and neuter for dogs and cats in Senkata.',
  lugar: 'Senkata',
  fecha: '2025-03-15',
  estado: 'cerrada',
  total_perros: 40,
  total_gatos: 24,
  total_machos: 30,
  total_hembras: 34,
  total_esterilizaciones: 64,
  fotos: ['campanas/senkata/1.webp', 'campanas/senkata/2.webp'],
});

const BORRADOR = fila({
  id: '9e8d7c6b-5a4f-4e3d-9c2b-1a0f9e8d7c6b',
  titulo_es: 'Borrador interno',
  fecha: '2026-12-01',
  estado: 'borrador',
});

const PUBLICADA_SIN_FECHA = fila({
  id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
  titulo_es: 'Publicada sin fecha',
  fecha: null,
});

describe('API pública de campañas (e2e)', () => {
  let app: INestApplication<App>;
  let filas: FilaBd[];
  let falloPostgres: boolean;

  /**
   * Simula PostgreSQL aplicando las mismas condiciones que la consulta real
   * (la prueba unitaria del servicio verifica que el SQL las contenga).
   * Devuelve la fila completa, con columnas administrativas, para comprobar
   * que la API las descarta.
   */
  const query = vi.fn(async (sql: string, parametros: unknown[] = []) => {
    if (!sql.includes('v_campanas_resumen')) return [{ '?column?': 1 }];
    if (falloPostgres) throw new Error('host secreto de PostgreSQL');

    return filas
      .filter((f) => ['publicada', 'cerrada'].includes(f.estado))
      .filter((f) => f.fecha !== null)
      .filter((f) =>
        sql.includes('campana.id = $1') ? f.id === parametros[0] : true,
      )
      .filter((f) =>
        sql.includes('extract(year')
          ? Number(f.fecha?.slice(0, 4)) === parametros[0]
          : true,
      )
      .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
  });

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue({
        destroy: vi.fn().mockResolvedValue(undefined),
        entityMetadatas: [],
        getRepository: vi.fn().mockReturnValue({}),
        isInitialized: true,
        options: { type: 'postgres' },
        query,
      })
      .compile();

    app = modulo.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    filas = [BORRADOR, PUBLICADA, CERRADA, PUBLICADA_SIN_FECHA];
    falloPostgres = false;
    query.mockClear();
  });

  const servidor = () => request(app.getHttpServer());

  describe(`GET ${URL_BASE}`, () => {
    it('es anónimo y devuelve solo campañas publicadas o cerradas con fecha', async () => {
      const respuesta = await servidor().get(URL_BASE).expect(200);

      expect(respuesta.body.map((c: { id: string }) => c.id)).toEqual([
        PUBLICADA.id,
        CERRADA.id,
      ]);
    });

    it('no expone borradores ni información administrativa', async () => {
      const respuesta = await servidor().get(URL_BASE).expect(200);
      const cuerpo = JSON.stringify(respuesta.body);

      for (const campana of respuesta.body as object[]) {
        expect(Object.keys(campana).sort()).toEqual(CAMPOS_PUBLICOS);
      }
      expect(cuerpo).not.toContain(BORRADOR.id);
      expect(cuerpo).not.toContain('Borrador interno');
      expect(cuerpo).not.toContain(ADMIN_ID);
      for (const campo of [
        'estado',
        'esHistorico',
        'es_historico',
        'creado',
        'actualizado',
      ]) {
        expect(cuerpo).not.toContain(campo);
      }
    });

    it('devuelve textos bilingües y cifras oficiales', async () => {
      const respuesta = await servidor().get(URL_BASE).expect(200);

      expect(respuesta.body).toEqual([
        {
          id: PUBLICADA.id,
          tituloEs: 'Campaña Villa Adela',
          tituloEn: 'Villa Adela campaign',
          descripcionEs: 'Esterilización gratuita.',
          descripcionEn: 'Free spay and neuter.',
          lugar: 'Villa Adela, El Alto',
          fecha: '2026-11-21',
          perros: 0,
          gatos: 0,
          machos: 0,
          hembras: 0,
          total: 0,
          fotos: [],
        },
        {
          id: CERRADA.id,
          tituloEs: 'Campaña Senkata',
          tituloEn: null,
          descripcionEs:
            'Esterilización gratuita de perros y gatos en Senkata.',
          descripcionEn:
            'Free spay and neuter for dogs and cats in Senkata.',
          lugar: 'Senkata',
          fecha: '2025-03-15',
          perros: 40,
          gatos: 24,
          machos: 30,
          hembras: 34,
          total: 64,
          fotos: ['campanas/senkata/1.webp', 'campanas/senkata/2.webp'],
        },
      ]);
    });

    it('filtra por año', async () => {
      const respuesta = await servidor()
        .get(`${URL_BASE}?anio=2025`)
        .expect(200);

      expect(respuesta.body.map((c: { id: string }) => c.id)).toEqual([
        CERRADA.id,
      ]);
    });

    it('rechaza un año no numérico (400)', async () => {
      await servidor().get(`${URL_BASE}?anio=dos-mil`).expect(400);
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining('v_campanas_resumen'),
        expect.anything(),
      );
    });

    it('oculta los detalles de PostgreSQL (503)', async () => {
      falloPostgres = true;

      const respuesta = await servidor().get(URL_BASE).expect(503);

      expect(JSON.stringify(respuesta.body)).not.toContain('host secreto');
    });
  });

  describe(`GET ${URL_BASE}/{id}`, () => {
    it('es anónimo y devuelve todo el contenido público sin datos internos', async () => {
      const respuesta = await servidor()
        .get(`${URL_BASE}/${CERRADA.id}`)
        .expect(200);

      expect(respuesta.body).toEqual({
        id: CERRADA.id,
        tituloEs: 'Campaña Senkata',
        tituloEn: null,
        descripcionEs:
          'Esterilización gratuita de perros y gatos en Senkata.',
        descripcionEn:
          'Free spay and neuter for dogs and cats in Senkata.',
        lugar: 'Senkata',
        fecha: '2025-03-15',
        perros: 40,
        gatos: 24,
        machos: 30,
        hembras: 34,
        total: 64,
        fotos: ['campanas/senkata/1.webp', 'campanas/senkata/2.webp'],
      });
      expect(Object.keys(respuesta.body).sort()).toEqual(CAMPOS_PUBLICOS);
      expect(JSON.stringify(respuesta.body)).not.toContain(ADMIN_ID);
      expect(JSON.stringify(respuesta.body)).not.toContain('cerrada');
    });

    it('responde 404 para un borrador, igual que para un id inexistente', async () => {
      const borrador = await servidor()
        .get(`${URL_BASE}/${BORRADOR.id}`)
        .expect(404);
      const inexistente = await servidor()
        .get(`${URL_BASE}/3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f`)
        .expect(404);

      expect(borrador.body.message).toBe(inexistente.body.message);
      expect(JSON.stringify(borrador.body)).not.toContain('Borrador interno');
    });

    it('responde 404 para una campaña publicada sin fecha', async () => {
      await servidor().get(`${URL_BASE}/${PUBLICADA_SIN_FECHA.id}`).expect(404);
    });

    it('rechaza un id que no es UUID (400)', async () => {
      await servidor().get(`${URL_BASE}/no-es-uuid`).expect(400);
    });
  });
});
