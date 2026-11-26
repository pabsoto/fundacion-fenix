import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PeticionConSesion } from '../src/common/types/peticion-sesion.js';
import { configureApplication } from '../src/config/configure-application.js';
import { AutorizacionAdministradorService } from '../src/modules/administradores/services/autorizacion-administrador.service.js';
import { CookieSesionService } from '../src/modules/auth/services/cookie-sesion.service.js';
import { SesionAdminService } from '../src/modules/auth/services/sesion-admin.service.js';
import { TAMANO_MAXIMO_FOTO } from '../src/modules/campanas/fotos-campana.service.js';
import { Historia } from '../src/modules/historias/entities/historia.entity.js';
import { StorageService } from '../src/modules/storage/storage.service.js';
import { crearJpg, crearPng } from './utils/imagenes.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const ID_INEXISTENTE = 'c7d5f2a0-3b1e-4c8a-9d6f-1a2b3c4d5e6f';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';
const URL_HISTORIAS = '/api/admin/historias';

const historiaValida = {
  animalNombre: 'Rocky',
  tituloEs: 'Rocky volvió a correr',
  tituloEn: 'Rocky is running again',
  textoEs: 'Texto de la historia',
  textoEn: 'Story text',
  autorNombre: 'Familia Quispe',
  fechaHistoria: '2026-10-15',
};

function crearHistoria(cambios: Partial<Historia> = {}): Historia {
  return {
    id: randomUUID(),
    animalNombre: 'Luna',
    tituloEs: 'Luna encontró un hogar',
    tituloEn: 'Luna found a home',
    textoEs: 'Texto',
    textoEn: 'Text',
    autorNombre: null,
    fechaHistoria: '2026-10-01',
    fotoRuta: null,
    fotoContentType: null,
    fotoTamano: null,
    fotoAncho: null,
    fotoAlto: null,
    orden: 1,
    visible: false,
    creadoPorId: null,
    creadoPor: null,
    actualizadoPorId: null,
    actualizadoPor: null,
    eliminadoPorId: null,
    eliminadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    eliminadoEn: null,
    ...cambios,
  };
}

const conFoto = (ruta = 'historias/a/foto.jpg') => ({
  fotoRuta: ruta,
  fotoContentType: 'image/jpeg',
  fotoTamano: 100,
  fotoAncho: 800,
  fotoAlto: 600,
});

describe('historias destacadas del panel (e2e)', () => {
  let app: INestApplication<App>;
  let filas: Historia[];
  let estadoCuenta: 'activo' | 'inactivo';

  const activas = () => filas.filter((fila) => !fila.eliminadoEn);
  const buscar = (id: string) =>
    activas().find((fila) => fila.id === id) ?? null;

  const repositorio = {
    find: vi.fn(async () => activas().sort((a, b) => a.orden - b.orden)),
    findOne: vi.fn(async ({ where }: { where: { id: string } }) =>
      buscar(where.id),
    ),
    existsBy: vi.fn(async ({ id }: { id: string }) => buscar(id) !== null),
    maximum: vi.fn(async () =>
      activas().length
        ? Math.max(...activas().map((fila) => fila.orden))
        : null,
    ),
    create: vi.fn((datos: Partial<Historia>) =>
      crearHistoria({ ...datos, id: randomUUID() }),
    ),
    save: vi.fn(async (entrada: Historia | Historia[]) => {
      for (const fila of [entrada].flat()) {
        if (!filas.includes(fila)) filas.push(fila);
      }
      return entrada;
    }),
  };
  const manager = { getRepository: vi.fn(() => repositorio) };
  const dataSource = {
    destroy: vi.fn().mockResolvedValue(undefined),
    entityMetadatas: [],
    getRepository: vi.fn().mockReturnValue({}),
    isInitialized: true,
    options: { type: 'postgres' },
    query: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(
      async (
        _nivel: string,
        operacion: (entityManager: typeof manager) => Promise<unknown>,
      ) => operacion(manager),
    ),
  };
  const storage = {
    subir: vi.fn(),
    eliminar: vi.fn(async () => undefined),
    obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(Historia))
      .useValue(repositorio)
      .overrideProvider(StorageService)
      .useValue(storage)
      .overrideProvider(SesionAdminService)
      .useValue({
        validar: vi.fn(async () => ({
          requiereRotacion: false,
          contexto: {
            id: 'sesion-id',
            administradorId: ADMIN_ID,
            csrfToken: CSRF,
            creadaEn: new Date(),
            tokenEmitidoEn: new Date(),
            ultimaActividadEn: new Date(),
            expiraEn: new Date(Date.now() + 60_000),
          },
        })),
      })
      .overrideProvider(CookieSesionService)
      .useValue({
        leerToken: (peticion: PeticionConSesion) =>
          (peticion.cookies as Record<string, string> | undefined)?.[
            'fenix_session'
          ],
        establecer: vi.fn(),
      })
      .overrideProvider(AutorizacionAdministradorService)
      .useValue({
        cargarParaSesion: vi.fn(async () => ({
          estado: estadoCuenta,
          administrador: { id: ADMIN_ID, nombre: 'Administración FÉNIX' },
        })),
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
    filas = [crearHistoria()];
    estadoCuenta = 'activo';
    vi.clearAllMocks();
  });

  const servidor = () => request(app.getHttpServer());

  /** Escritura con sesión y token CSRF válidos. */
  const escribir = (metodo: 'post' | 'put' | 'delete', ruta: string) =>
    servidor()[metodo](ruta).set('Cookie', COOKIE).set('X-CSRF-Token', CSRF);

  const subir = (id: string, contenido: Buffer, contentType = 'image/jpeg') =>
    escribir('post', `${URL_HISTORIAS}/${id}/foto`).attach(
      'archivo',
      contenido,
      { filename: 'foto', contentType },
    );

  const ESCRITURAS = [
    ['post', URL_HISTORIAS],
    ['put', `${URL_HISTORIAS}/orden`],
    ['put', `${URL_HISTORIAS}/${ID_INEXISTENTE}`],
    ['delete', `${URL_HISTORIAS}/${ID_INEXISTENTE}`],
    ['post', `${URL_HISTORIAS}/${ID_INEXISTENTE}/foto`],
  ] as const;

  describe('acceso', () => {
    it('rechaza el listado sin sesión (401)', async () => {
      await servidor().get(URL_HISTORIAS).expect(401);
    });

    it.each(ESCRITURAS)('rechaza %s %s sin sesión (401)', async (m, ruta) => {
      await servidor()[m](ruta).expect(401);
      expect(repositorio.save).not.toHaveBeenCalled();
    });

    it.each(ESCRITURAS)(
      'rechaza %s %s sin token CSRF (403)',
      async (m, ruta) => {
        await servidor()[m](ruta).set('Cookie', COOKIE).expect(403);
        expect(repositorio.save).not.toHaveBeenCalled();
      },
    );

    it.each(ESCRITURAS)(
      'rechaza %s %s con un token CSRF inválido (403)',
      async (m, ruta) => {
        await servidor()
          [m](ruta)
          .set('Cookie', COOKIE)
          .set('X-CSRF-Token', 'otro-token')
          .expect(403);
        expect(repositorio.save).not.toHaveBeenCalled();
      },
    );

    it('rechaza una escritura desde un origen no autorizado (403)', async () => {
      await escribir('post', URL_HISTORIAS)
        .set('Origin', 'https://otro-sitio.test')
        .send(historiaValida)
        .expect(403);
    });

    it('rechaza una cuenta desactivada (403)', async () => {
      estadoCuenta = 'inactivo';
      await servidor().get(URL_HISTORIAS).set('Cookie', COOKIE).expect(403);
      await escribir('post', URL_HISTORIAS).send(historiaValida).expect(403);
    });
  });

  describe('GET /api/admin/historias', () => {
    it('lista las no eliminadas sin datos internos', async () => {
      filas = [
        crearHistoria({ ...conFoto(), creadoPorId: ADMIN_ID }),
        crearHistoria({ orden: 2, eliminadoEn: new Date() }),
      ];

      const respuesta = await servidor()
        .get(URL_HISTORIAS)
        .set('Cookie', COOKIE)
        .expect(200);

      expect(respuesta.headers['cache-control']).toBe('no-store');
      expect(respuesta.body).toHaveLength(1);
      expect(respuesta.body[0].foto).toEqual({
        url: 'https://cdn.test/historias/a/foto.jpg',
        ancho: 800,
        alto: 600,
      });
      for (const interno of ['creadoPorId', 'fotoRuta', 'eliminadoEn']) {
        expect(respuesta.body[0]).not.toHaveProperty(interno);
      }
    });
  });

  describe('POST /api/admin/historias', () => {
    it('crea la historia oculta y al final del orden', async () => {
      const respuesta = await escribir('post', URL_HISTORIAS)
        .send({ ...historiaValida, animalNombre: '  Rocky  ' })
        .expect(201);

      expect(respuesta.body).toMatchObject({
        ...historiaValida,
        orden: 2,
        visible: false,
        foto: null,
      });
      expect(filas[1]).toMatchObject({
        creadoPorId: ADMIN_ID,
        actualizadoPorId: ADMIN_ID,
      });
    });

    it('guarda un autor vacío como null', async () => {
      const respuesta = await escribir('post', URL_HISTORIAS)
        .send({ ...historiaValida, autorNombre: '   ' })
        .expect(201);
      expect(respuesta.body.autorNombre).toBeNull();
    });

    it.each([
      'animalNombre',
      'tituloEs',
      'tituloEn',
      'textoEs',
      'textoEn',
      'fechaHistoria',
    ])('rechaza %s vacío (400)', async (campo) => {
      await escribir('post', URL_HISTORIAS)
        .send({ ...historiaValida, [campo]: '   ' })
        .expect(400);
      expect(repositorio.save).not.toHaveBeenCalled();
    });

    it.each(['15/10/2026', '2026-02-30', '2026-10-15T10:00:00Z'])(
      'rechaza la fecha %s (400)',
      async (fechaHistoria) => {
        await escribir('post', URL_HISTORIAS)
          .send({ ...historiaValida, fechaHistoria })
          .expect(400);
      },
    );

    it.each([{ visible: true }, { orden: 9 }])(
      'no permite fijar %j al crear (400)',
      async (extra) => {
        await escribir('post', URL_HISTORIAS)
          .send({ ...historiaValida, ...extra })
          .expect(400);
      },
    );
  });

  describe('PUT /api/admin/historias/:id', () => {
    const url = () => `${URL_HISTORIAS}/${filas[0].id}`;

    it('edita la historia y registra quién la cambió', async () => {
      const respuesta = await escribir('put', url())
        .send({ ...historiaValida, visible: false })
        .expect(200);

      expect(respuesta.body).toMatchObject(historiaValida);
      expect(filas[0].actualizadoPorId).toBe(ADMIN_ID);
    });

    it('no publica una historia sin foto (409)', async () => {
      await escribir('put', url())
        .send({ ...historiaValida, visible: true })
        .expect(409);
      expect(repositorio.save).not.toHaveBeenCalled();
    });

    it('publica y vuelve a ocultar una historia con foto', async () => {
      Object.assign(filas[0], conFoto());

      await escribir('put', url())
        .send({ ...historiaValida, visible: true })
        .expect(200);
      expect(filas[0].visible).toBe(true);

      await escribir('put', url())
        .send({ ...historiaValida, visible: false })
        .expect(200);
      expect(filas[0]).toMatchObject({ visible: false, ...conFoto() });
    });

    it('exige indicar la visibilidad (400)', async () => {
      await escribir('put', url()).send(historiaValida).expect(400);
    });

    it('responde 404 si no existe o está eliminada', async () => {
      const cuerpo = { ...historiaValida, visible: false };
      await escribir('put', `${URL_HISTORIAS}/${ID_INEXISTENTE}`)
        .send(cuerpo)
        .expect(404);
      filas[0].eliminadoEn = new Date();
      await escribir('put', url()).send(cuerpo).expect(404);
    });

    it('rechaza un identificador que no es UUID (400)', async () => {
      await escribir('put', `${URL_HISTORIAS}/123`)
        .send({ ...historiaValida, visible: false })
        .expect(400);
    });
  });

  describe('PUT /api/admin/historias/orden', () => {
    beforeEach(() => {
      filas = [crearHistoria({ orden: 1 }), crearHistoria({ orden: 2 })];
    });

    it('guarda el nuevo orden', async () => {
      const ids = [filas[1].id, filas[0].id];

      const respuesta = await escribir('put', `${URL_HISTORIAS}/orden`)
        .send({ ids })
        .expect(200);

      expect(respuesta.body.map((h: { id: string }) => h.id)).toEqual(ids);
      expect(filas.map((fila) => fila.orden)).toEqual([2, 1]);
      expect(filas.map((fila) => fila.actualizadoPorId)).toEqual([
        ADMIN_ID,
        ADMIN_ID,
      ]);
    });

    it.each([
      ['incompleta', () => [filas[0].id]],
      ['con un id ajeno', () => [filas[0].id, ID_INEXISTENTE]],
      ['repetida', () => [filas[0].id, filas[0].id]],
      ['vacía', () => []],
      ['con un valor que no es UUID', () => [filas[0].id, 'x']],
    ])('rechaza una lista %s (400)', async (_caso, ids) => {
      await escribir('put', `${URL_HISTORIAS}/orden`)
        .send({ ids: ids() })
        .expect(400);
      expect(repositorio.save).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/admin/historias/:id', () => {
    it('borra de forma lógica y quita la foto de Storage', async () => {
      Object.assign(filas[0], conFoto(), { visible: true });
      const url = `${URL_HISTORIAS}/${filas[0].id}`;

      await escribir('delete', url).expect(204);

      expect(filas).toHaveLength(1);
      expect(filas[0]).toMatchObject({
        visible: false,
        fotoRuta: null,
        eliminadoPorId: ADMIN_ID,
        actualizadoPorId: ADMIN_ID,
        eliminadoEn: expect.any(Date),
      });
      expect(storage.eliminar).toHaveBeenCalledWith('historias/a/foto.jpg');
      const lista = await servidor()
        .get(URL_HISTORIAS)
        .set('Cookie', COOKIE)
        .expect(200);
      expect(lista.body).toEqual([]);
      await escribir('delete', url).expect(404);
    });

    it('no llama a Storage si la historia no tenía foto', async () => {
      await escribir('delete', `${URL_HISTORIAS}/${filas[0].id}`).expect(204);
      expect(storage.eliminar).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/historias/:id/foto', () => {
    it('guarda una foto vertical de celular con sus medidas visibles', async () => {
      const respuesta = await subir(filas[0].id, crearJpg(1600, 900, 6)).expect(
        201,
      );

      expect(respuesta.body.foto).toMatchObject({ ancho: 900, alto: 1600 });
      expect(filas[0]).toMatchObject({
        fotoAncho: 900,
        fotoAlto: 1600,
        fotoContentType: 'image/jpeg',
        actualizadoPorId: ADMIN_ID,
      });
      expect(filas[0].fotoRuta).toMatch(
        new RegExp(`^historias/${filas[0].id}/.+\\.jpg$`),
      );
    });

    it('reemplaza la foto y borra la anterior', async () => {
      Object.assign(filas[0], conFoto('historias/a/anterior.jpg'));

      await subir(filas[0].id, crearPng(640, 480), 'image/png').expect(201);

      expect(filas[0].fotoRuta).toMatch(/\.png$/);
      expect(storage.eliminar).toHaveBeenCalledExactlyOnceWith(
        'historias/a/anterior.jpg',
      );
    });

    it('responde 404 sin subir nada si la historia no existe', async () => {
      await subir(ID_INEXISTENTE, crearJpg(10, 10)).expect(404);
      expect(storage.subir).not.toHaveBeenCalled();
    });

    it('rechaza una petición sin archivo (400)', async () => {
      await escribir('post', `${URL_HISTORIAS}/${filas[0].id}/foto`).expect(
        400,
      );
    });

    it('rechaza una foto de más de 5 MB (413)', async () => {
      await subir(filas[0].id, Buffer.alloc(TAMANO_MAXIMO_FOTO + 1)).expect(
        413,
      );
      expect(storage.subir).not.toHaveBeenCalled();
    });

    it.each([
      ['que no es imagen', Buffer.from('GIF89a-no-valido'), 'image/jpeg'],
      ['con un tipo declarado distinto', crearPng(10, 10), 'image/jpeg'],
      ['dañada', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), 'image/jpeg'],
    ])('rechaza una foto %s (415)', async (_caso, contenido, tipo) => {
      await subir(filas[0].id, contenido, tipo).expect(415);
      expect(storage.subir).not.toHaveBeenCalled();
    });

    it('responde 503 si Storage no está disponible', async () => {
      storage.subir.mockRejectedValueOnce(new Error('Storage caído'));
      await subir(filas[0].id, crearJpg(10, 10)).expect(503);
      expect(filas[0].fotoRuta).toBeNull();
    });
  });
});
