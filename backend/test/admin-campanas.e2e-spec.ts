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
import { Auditoria } from '../src/modules/auditoria/entities/auditoria.entity.js';
import { CookieSesionService } from '../src/modules/auth/services/cookie-sesion.service.js';
import { SesionAdminService } from '../src/modules/auth/services/sesion-admin.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';
const URL_BASE = '/api/admin/campanas';

const borrador = {
  tituloEs: '  Campaña Villa Adela  ',
  estado: 'borrador',
};

const publicada = {
  tituloEs: 'Campaña Villa Adela',
  tituloEn: 'Villa Adela campaign',
  descripcionEs: 'Esterilización gratuita de perros y gatos.',
  lugar: 'Villa Adela, El Alto',
  fecha: '2026-11-21',
  estado: 'publicada',
};

function crearCampana(cambios: Partial<Campana> = {}): Campana {
  return Object.assign(new Campana(), {
    id: randomUUID(),
    tituloEs: 'Campaña existente',
    tituloEn: null,
    descripcionEs: null,
    descripcionEn: null,
    lugar: null,
    fecha: null,
    estado: 'borrador',
    perrosMachos: 0,
    perrosHembras: 0,
    gatosMachos: 0,
    gatosHembras: 0,
    esHistorico: false,
    creadoPorId: null,
    creadoPor: null,
    actualizadoPorId: null,
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  });
}

describe('administración de campañas (e2e)', () => {
  let app: INestApplication<App>;
  let campanas: Campana[];
  let auditorias: Array<Partial<Auditoria>>;
  let administradorActivo: boolean;

  const buscarPorId = async ({ where }: { where: { id: string } }) =>
    campanas.find((campana) => campana.id === where.id) ?? null;

  const repositorioLectura = {
    find: vi.fn(async () => [...campanas]),
    findOne: vi.fn(buscarPorId),
  };

  const repositorioCampanasTransaccion = {
    findOne: vi.fn(buscarPorId),
    create: vi.fn((datos: Partial<Campana>) =>
      crearCampana({ ...datos, id: randomUUID() }),
    ),
    save: vi.fn(async (campana: Campana) => {
      const indice = campanas.findIndex((actual) => actual.id === campana.id);
      if (indice === -1) campanas.push(campana);
      else campanas[indice] = campana;
      return campana;
    }),
  };

  const repositorioAuditoriaTransaccion = {
    create: vi.fn((datos: Partial<Auditoria>) => ({
      id: randomUUID(),
      ...datos,
    })),
    save: vi.fn(async (auditoria: Partial<Auditoria>) => {
      auditorias.push(auditoria);
      return auditoria;
    }),
  };

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === Campana
        ? repositorioCampanasTransaccion
        : repositorioAuditoriaTransaccion,
    ),
  };

  const dataSource = {
    destroy: vi.fn().mockResolvedValue(undefined),
    entityMetadatas: [],
    getRepository: vi.fn().mockReturnValue({}),
    isInitialized: true,
    options: { type: 'postgres' },
    query: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(
      async (
        _aislamiento: string,
        operacion: (entityManager: typeof manager) => Promise<unknown>,
      ) => operacion(manager),
    ),
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(Campana))
      .useValue(repositorioLectura)
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
        cargarParaSesion: vi.fn(async () =>
          administradorActivo
            ? {
                estado: 'activo',
                administrador: { id: ADMIN_ID, nombre: 'Administración FÉNIX' },
              }
            : { estado: 'inactivo' },
        ),
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
    campanas = [];
    auditorias = [];
    administradorActivo = true;
    vi.clearAllMocks();
  });

  const servidor = () => request(app.getHttpServer());

  describe('autorización', () => {
    it('rechaza listar sin sesión (401)', async () => {
      await servidor().get(URL_BASE).expect(401);
    });

    it('rechaza crear sin sesión (401)', async () => {
      await servidor().post(URL_BASE).send(publicada).expect(401);
      expect(campanas).toHaveLength(0);
    });

    it('rechaza un administrador desactivado (403)', async () => {
      administradorActivo = false;
      await servidor().get(URL_BASE).set('Cookie', COOKIE).expect(403);
    });

    it('rechaza crear sin token CSRF (403)', async () => {
      await servidor()
        .post(URL_BASE)
        .set('Cookie', COOKIE)
        .send(publicada)
        .expect(403);
      expect(campanas).toHaveLength(0);
    });

    it('rechaza actualizar con un token CSRF incorrecto (403)', async () => {
      const existente = crearCampana();
      campanas = [existente];
      await servidor()
        .put(`${URL_BASE}/${existente.id}`)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', 'otro-token')
        .send(publicada)
        .expect(403);
      expect(campanas[0].tituloEs).toBe('Campaña existente');
    });
  });

  describe('crear y recuperar', () => {
    it('crea un borrador sin lugar ni fecha y lo audita', async () => {
      const respuesta = await servidor()
        .post(URL_BASE)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(borrador)
        .expect(201);

      expect(respuesta.body).toMatchObject({
        tituloEs: 'Campaña Villa Adela',
        lugar: null,
        fecha: null,
        estado: 'borrador',
      });
      expect(respuesta.body).not.toHaveProperty('creadoPorId');
      expect(campanas[0]).toMatchObject({ creadoPorId: ADMIN_ID });
      expect(auditorias).toEqual([
        expect.objectContaining({
          tabla: 'campanas',
          accion: 'INSERT',
          administradorId: ADMIN_ID,
          registroId: respuesta.body.id,
        }),
      ]);
    });

    it('crea una campaña publicada y la recupera por id y en el listado', async () => {
      const creada = await servidor()
        .post(URL_BASE)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(publicada)
        .expect(201);

      const porId = await servidor()
        .get(`${URL_BASE}/${creada.body.id}`)
        .set('Cookie', COOKIE)
        .expect(200);
      expect(porId.body).toMatchObject(publicada);

      const listado = await servidor()
        .get(URL_BASE)
        .set('Cookie', COOKIE)
        .expect(200);
      expect(listado.body).toEqual([
        expect.objectContaining({ id: creada.body.id }),
      ]);
    });
  });

  describe('contadores', () => {
    it('crea una campaña con contadores y devuelve los totales', async () => {
      const creada = await servidor()
        .post(URL_BASE)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send({
          ...publicada,
          perrosMachos: 12,
          perrosHembras: 20,
          gatosMachos: 8,
          gatosHembras: 15,
        })
        .expect(201);

      expect(creada.body).toMatchObject({
        perrosMachos: 12,
        perrosHembras: 20,
        gatosMachos: 8,
        gatosHembras: 15,
        totales: { perros: 32, gatos: 23, machos: 20, hembras: 35, total: 55 },
      });
    });
  });

  describe('editar', () => {
    it('publica un borrador existente y registra los cambios', async () => {
      const existente = crearCampana({
        creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      });
      campanas = [existente];

      const respuesta = await servidor()
        .put(`${URL_BASE}/${existente.id}`)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(publicada)
        .expect(200);

      expect(respuesta.body).toMatchObject({ id: existente.id, ...publicada });
      expect(campanas[0]).toMatchObject({
        creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        actualizadoPorId: ADMIN_ID,
      });
      expect(auditorias[0]).toMatchObject({
        accion: 'UPDATE',
        datosAntes: expect.objectContaining({ estado: 'borrador' }),
        datosDespues: expect.objectContaining({ estado: 'publicada' }),
      });
    });

    it('responde 404 si la campaña no existe', async () => {
      await servidor()
        .put(`${URL_BASE}/${randomUUID()}`)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(publicada)
        .expect(404);
    });

    it('responde 409 si la campaña está cerrada', async () => {
      const cerrada = crearCampana({ estado: 'cerrada', perrosMachos: 5 });
      campanas = [cerrada];
      await servidor()
        .put(`${URL_BASE}/${cerrada.id}`)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(publicada)
        .expect(409);
      expect(auditorias).toHaveLength(0);
    });

    it('responde 400 si el id no es un UUID', async () => {
      await servidor()
        .get(`${URL_BASE}/no-es-uuid`)
        .set('Cookie', COOKIE)
        .expect(400);
    });
  });

  describe('validación', () => {
    const casosInvalidos: Array<[string, Record<string, unknown>]> = [
      ['sin título', { estado: 'borrador' }],
      ['título vacío', { tituloEs: '   ', estado: 'borrador' }],
      [
        'título demasiado largo',
        { tituloEs: 'x'.repeat(201), estado: 'borrador' },
      ],
      ['estado desconocido', { tituloEs: 'Campaña', estado: 'realizada' }],
      [
        'estado cerrada (se gestiona en HU-12)',
        { tituloEs: 'Campaña', estado: 'cerrada' },
      ],
      ['publicar sin lugar', { ...publicada, lugar: '' }],
      ['publicar sin fecha', { ...publicada, fecha: null }],
      ['fecha con formato inválido', { ...publicada, fecha: '21/11/2026' }],
      ['fecha inexistente', { ...publicada, fecha: '2026-02-30' }],
      ['campo no permitido', { ...publicada, otroCampo: 10 }],
      ['contador negativo', { ...publicada, perrosMachos: -3 }],
      ['contador decimal', { ...publicada, gatosHembras: 2.5 }],
      ['contador de texto', { ...publicada, gatosMachos: 'abc' }],
      ['contador excesivo', { ...publicada, perrosHembras: 100001 }],
    ];

    it.each(casosInvalidos)('rechaza %s con 400', async (_caso, cuerpo) => {
      const respuesta = await servidor()
        .post(URL_BASE)
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(cuerpo)
        .expect(400);

      expect(respuesta.body).toHaveProperty('message');
      expect(campanas).toHaveLength(0);
      expect(auditorias).toHaveLength(0);
    });
  });
});
