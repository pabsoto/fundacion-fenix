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
import { CanalContacto } from '../src/modules/canales-contacto/entities/canal-contacto.entity.js';
import { ContenidoInstitucional } from '../src/modules/contenido-institucional/entities/contenido-institucional.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';

function crearContenido(
  cambios: Partial<ContenidoInstitucional> = {},
): ContenidoInstitucional {
  return {
    id: randomUUID(),
    clave: 'hero_principal',
    tituloEs: 'Título anterior',
    tituloEn: 'Previous title',
    textoEs: 'Texto anterior',
    textoEn: 'Previous text',
    imagenRuta: null,
    orden: 1,
    visible: true,
    actualizadoPorId: null,
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  };
}

function crearCanal(cambios: Partial<CanalContacto> = {}): CanalContacto {
  return {
    id: randomUUID(),
    tipo: 'whatsapp',
    url: 'https://wa.me/59170000000',
    textoEs: 'Escríbenos',
    textoEn: 'Message us',
    orden: 1,
    activo: true,
    actualizadoPorId: null,
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  };
}

const contenidoValido = {
  tituloEs: 'Nuevo título',
  tituloEn: 'New title',
  textoEs: 'Nuevo texto',
  textoEn: 'New text',
  visible: false,
};

const canalValido = {
  url: 'https://wa.me/59171111111',
  textoEs: 'Hablemos',
  textoEn: "Let's talk",
  activo: true,
};

describe('administración de contenido y canales (e2e)', () => {
  let app: INestApplication<App>;
  let contenidos: ContenidoInstitucional[];
  let canales: CanalContacto[];
  let auditorias: Array<Partial<Auditoria>>;

  const repositorioContenido = {
    find: vi.fn(async () => contenidos),
    findOne: vi.fn(
      async ({ where }: { where: { clave: string } }) =>
        contenidos.find((c) => c.clave === where.clave) ?? null,
    ),
    save: vi.fn(async (fila: ContenidoInstitucional) => fila),
  };
  const repositorioCanales = {
    find: vi.fn(async () => canales),
    findOne: vi.fn(
      async ({ where }: { where: { tipo: string } }) =>
        canales.find((c) => c.tipo === where.tipo) ?? null,
    ),
    save: vi.fn(async (fila: CanalContacto) => fila),
  };
  const repositorioAuditoria = {
    create: vi.fn((datos: Partial<Auditoria>) => ({
      id: randomUUID(),
      creadoEn: new Date(),
      ...datos,
    })),
    save: vi.fn(async (auditoria: Partial<Auditoria>) => {
      auditorias.push(auditoria);
      return auditoria;
    }),
  };
  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === ContenidoInstitucional
        ? repositorioContenido
        : entidad === CanalContacto
          ? repositorioCanales
          : repositorioAuditoria,
    ),
  };
  const dataSource = {
    destroy: vi.fn().mockResolvedValue(undefined),
    entityMetadatas: [],
    getRepository: vi.fn().mockReturnValue({}),
    isInitialized: true,
    options: { type: 'postgres' },
    query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    transaction: vi.fn(
      async (operacion: (entityManager: typeof manager) => Promise<unknown>) =>
        operacion(manager),
    ),
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(ContenidoInstitucional))
      .useValue(repositorioContenido)
      .overrideProvider(getRepositoryToken(CanalContacto))
      .useValue(repositorioCanales)
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
          estado: 'activo',
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
    contenidos = [crearContenido()];
    canales = [crearCanal()];
    auditorias = [];
    vi.clearAllMocks();
  });

  describe('/api/admin/contenido', () => {
    it('lista las secciones con una sesión activa', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/api/admin/contenido')
        .set('Cookie', COOKIE)
        .expect(200);
      expect(respuesta.body).toHaveLength(1);
      expect(respuesta.body[0]).toMatchObject({ clave: 'hero_principal' });
      expect(respuesta.body[0]).not.toHaveProperty('actualizadoPorId');
    });

    it('rechaza GET y PUT sin sesión (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/contenido')
        .expect(401);
      await request(app.getHttpServer())
        .put('/api/admin/contenido/hero_principal')
        .send(contenidoValido)
        .expect(401);
    });

    it('rechaza PUT sin token CSRF (403)', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/contenido/hero_principal')
        .set('Cookie', COOKIE)
        .send(contenidoValido)
        .expect(403);
    });

    it('actualiza la sección y registra la auditoría', async () => {
      const respuesta = await request(app.getHttpServer())
        .put('/api/admin/contenido/hero_principal')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(contenidoValido)
        .expect(200);

      expect(respuesta.body).toMatchObject({
        clave: 'hero_principal',
        ...contenidoValido,
      });
      expect(contenidos[0]).toMatchObject({
        textoEs: 'Nuevo texto',
        visible: false,
        actualizadoPorId: ADMIN_ID,
      });
      expect(auditorias).toHaveLength(1);
      expect(auditorias[0]).toMatchObject({
        administradorId: ADMIN_ID,
        tabla: 'contenido_institucional',
        registroId: contenidos[0].id,
        accion: 'UPDATE',
      });
      expect(auditorias[0].camposModificados).toEqual(
        expect.arrayContaining(['texto_es', 'titulo_es', 'visible']),
      );
      expect(auditorias[0].camposModificados).not.toContain('orden');
    });

    it('rechaza un campo obligatorio vacío (400)', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/contenido/hero_principal')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send({ ...contenidoValido, textoEs: '   ' })
        .expect(400);
      expect(auditorias).toHaveLength(0);
    });

    it('responde 404 si la sección no existe', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/contenido/no_existe')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(contenidoValido)
        .expect(404);
    });
  });

  describe('/api/admin/canales', () => {
    it('lista los canales con una sesión activa', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/api/admin/canales')
        .set('Cookie', COOKIE)
        .expect(200);
      expect(respuesta.body[0]).toMatchObject({ tipo: 'whatsapp' });
    });

    it('rechaza GET y PUT sin sesión (401)', async () => {
      await request(app.getHttpServer()).get('/api/admin/canales').expect(401);
      await request(app.getHttpServer())
        .put('/api/admin/canales/whatsapp')
        .send(canalValido)
        .expect(401);
    });

    it('rechaza PUT sin token CSRF (403)', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/canales/whatsapp')
        .set('Cookie', COOKIE)
        .send(canalValido)
        .expect(403);
    });

    it('actualiza el canal y registra la auditoría', async () => {
      const respuesta = await request(app.getHttpServer())
        .put('/api/admin/canales/whatsapp')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(canalValido)
        .expect(200);

      expect(respuesta.body).toMatchObject({
        tipo: 'whatsapp',
        url: 'https://wa.me/59171111111',
      });
      expect(canales[0].actualizadoPorId).toBe(ADMIN_ID);
      expect(auditorias).toHaveLength(1);
      expect(auditorias[0]).toMatchObject({
        administradorId: ADMIN_ID,
        tabla: 'canales_contacto',
        accion: 'UPDATE',
      });
      expect(auditorias[0].camposModificados).toContain('url');
    });

    it('acepta una URL mailto: para el correo', async () => {
      canales = [crearCanal({ tipo: 'email', url: 'mailto:a@b.org' })];
      await request(app.getHttpServer())
        .put('/api/admin/canales/email')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send({ ...canalValido, url: 'mailto:contacto@fundacion.org' })
        .expect(200);
    });

    it.each(['http://wa.me/1', 'javascript:alert(1)', 'wa.me/1', ''])(
      'rechaza la URL inválida %j (400)',
      async (url) => {
        await request(app.getHttpServer())
          .put('/api/admin/canales/whatsapp')
          .set('Cookie', COOKIE)
          .set('X-CSRF-Token', CSRF)
          .send({ ...canalValido, url })
          .expect(400);
        expect(auditorias).toHaveLength(0);
      },
    );

    it('rechaza un tipo de canal desconocido (400)', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/canales/telegram')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(canalValido)
        .expect(400);
    });

    it('responde 404 si el canal no está registrado', async () => {
      canales = [];
      await request(app.getHttpServer())
        .put('/api/admin/canales/whatsapp')
        .set('Cookie', COOKIE)
        .set('X-CSRF-Token', CSRF)
        .send(canalValido)
        .expect(404);
    });
  });
});
