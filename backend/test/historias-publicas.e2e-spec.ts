import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { FindOperator } from 'typeorm';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/config/configure-application.js';
import { Historia } from '../src/modules/historias/entities/historia.entity.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const URL_BASE = '/api/public/historias';
const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const CAMPOS_PUBLICOS = [
  'id',
  'animalNombre',
  'tituloEs',
  'tituloEn',
  'textoEs',
  'textoEn',
  'autorNombre',
  'fechaHistoria',
  'foto',
].sort();

function crearHistoria(cambios: Partial<Historia> & Pick<Historia, 'id' | 'orden'>): Historia {
  return {
    animalNombre: 'Animal',
    tituloEs: 'Título',
    tituloEn: 'Title',
    textoEs: 'Texto',
    textoEn: 'Text',
    autorNombre: null,
    fechaHistoria: '2026-01-01',
    fotoRuta: null,
    fotoContentType: null,
    fotoTamano: null,
    fotoAncho: null,
    fotoAlto: null,
    visible: true,
    creadoPorId: ADMIN_ID,
    creadoPor: null,
    actualizadoPorId: ADMIN_ID,
    actualizadoPor: null,
    eliminadoPorId: null,
    eliminadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
    eliminadoEn: null,
    ...cambios,
  };
}

const PRIMERA = crearHistoria({
  id: '11111111-1111-4111-8111-111111111111',
  orden: 1,
  animalNombre: 'Luna',
  tituloEs: 'Luna encontró un hogar',
  tituloEn: 'Luna found a home',
  textoEs: 'Texto visible de Luna.',
  textoEn: 'Visible text about Luna.',
  autorNombre: 'Familia Quispe',
  fechaHistoria: '2026-10-01',
  fotoRuta: 'historias/luna/vertical.jpg',
  fotoContentType: 'image/jpeg',
  fotoTamano: 1200,
  fotoAncho: 900,
  fotoAlto: 1600,
});

const SEGUNDA = crearHistoria({
  id: '22222222-2222-4222-8222-222222222222',
  orden: 2,
  animalNombre: 'Max',
  tituloEs: 'Max avanza',
  tituloEn: 'Max moves forward',
  autorNombre: null,
  fechaHistoria: '2026-08-03',
  fotoRuta: 'historias/max/horizontal.webp',
  fotoContentType: 'image/webp',
  fotoTamano: 800,
  fotoAncho: 1600,
  fotoAlto: 900,
});

const OCULTA = crearHistoria({
  id: '33333333-3333-4333-8333-333333333333',
  orden: 0,
  animalNombre: 'Oculta',
  tituloEs: 'Historia oculta',
  visible: false,
  fotoRuta: 'historias/oculta/secreta.jpg',
});

const ELIMINADA = crearHistoria({
  id: '44444444-4444-4444-8444-444444444444',
  orden: 3,
  animalNombre: 'Eliminada',
  tituloEs: 'Historia eliminada',
  eliminadoEn: new Date('2026-09-01T00:00:00.000Z'),
  eliminadoPorId: ADMIN_ID,
  fotoRuta: 'historias/eliminada/foto.jpg',
});

function esNulo(valor: unknown): boolean {
  return valor instanceof FindOperator && valor.type === 'isNull';
}

describe('API pública de historias (e2e)', () => {
  let app: INestApplication<App>;
  let filas: Historia[];
  let falloPostgres: boolean;

  const find = vi.fn(
    async (opciones?: {
      where?: { visible?: boolean; eliminadoEn?: unknown };
      order?: { orden?: 'ASC' | 'DESC' };
    }) => {
      if (falloPostgres) throw new Error('host secreto de PostgreSQL');
      const where = opciones?.where;
      const visibles = filas.filter((fila) => {
        if (where?.visible === true && !fila.visible) return false;
        if (where && 'eliminadoEn' in where && esNulo(where.eliminadoEn) && fila.eliminadoEn) {
          return false;
        }
        return true;
      });
      if (opciones?.order?.orden === 'ASC') {
        visibles.sort((a, b) => a.orden - b.orden);
      }
      return visibles;
    },
  );

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
        query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .overrideProvider(getRepositoryToken(Historia))
      .useValue({ find })
      .overrideProvider(StorageService)
      .useValue({
        obtenerUrlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
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
    filas = [SEGUNDA, ELIMINADA, OCULTA, PRIMERA];
    falloPostgres = false;
    find.mockClear();
  });

  const servidor = () => request(app.getHttpServer());

  it('es anónimo y devuelve solo historias visibles y no eliminadas, en orden', async () => {
    const respuesta = await servidor().get(URL_BASE).expect(200);

    expect(respuesta.body.map((historia: { id: string }) => historia.id)).toEqual([
      PRIMERA.id,
      SEGUNDA.id,
    ]);
    expect(JSON.stringify(respuesta.body)).not.toContain(OCULTA.id);
    expect(JSON.stringify(respuesta.body)).not.toContain(ELIMINADA.id);
    expect(JSON.stringify(respuesta.body)).not.toContain('Historia oculta');
    expect(JSON.stringify(respuesta.body)).not.toContain('Historia eliminada');
  });

  it('expone la foto con URL pública, ancho y alto, y ningún campo interno', async () => {
    const respuesta = await servidor().get(URL_BASE).expect(200);
    const cuerpo = JSON.stringify(respuesta.body);

    expect(respuesta.body).toEqual([
      {
        id: PRIMERA.id,
        animalNombre: 'Luna',
        tituloEs: 'Luna encontró un hogar',
        tituloEn: 'Luna found a home',
        textoEs: 'Texto visible de Luna.',
        textoEn: 'Visible text about Luna.',
        autorNombre: 'Familia Quispe',
        fechaHistoria: '2026-10-01',
        foto: {
          url: 'https://cdn.test/historias/luna/vertical.jpg',
          ancho: 900,
          alto: 1600,
        },
      },
      {
        id: SEGUNDA.id,
        animalNombre: 'Max',
        tituloEs: 'Max avanza',
        tituloEn: 'Max moves forward',
        textoEs: 'Texto',
        textoEn: 'Text',
        autorNombre: null,
        fechaHistoria: '2026-08-03',
        foto: {
          url: 'https://cdn.test/historias/max/horizontal.webp',
          ancho: 1600,
          alto: 900,
        },
      },
    ]);

    for (const historia of respuesta.body as object[]) {
      expect(Object.keys(historia).sort()).toEqual(CAMPOS_PUBLICOS);
    }
    expect(cuerpo).not.toContain(ADMIN_ID);
    for (const campo of [
      '"orden"',
      '"visible"',
      'fotoRuta',
      'fotoContentType',
      'fotoTamano',
      'creadoPor',
      'creado_por',
      'actualizadoPor',
      'actualizado_por',
      'eliminadoPor',
      'eliminado_por',
      'creadoEn',
      'actualizadoEn',
      'eliminadoEn',
    ]) {
      expect(cuerpo).not.toContain(campo);
    }
    for (const foto of respuesta.body.map(
      (historia: { foto: object }) => historia.foto,
    )) {
      expect(Object.keys(foto).sort()).toEqual(['alto', 'ancho', 'url']);
    }
  });

  it('oculta los detalles de PostgreSQL (503)', async () => {
    falloPostgres = true;

    const respuesta = await servidor().get(URL_BASE).expect(503);

    expect(JSON.stringify(respuesta.body)).not.toContain('host secreto');
  });
});
