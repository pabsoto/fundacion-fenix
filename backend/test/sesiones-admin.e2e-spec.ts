import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/config/configure-application.js';
import { Administrador } from '../src/modules/administradores/entities/administrador.entity.js';
import { ClienteOAuthGoogleService } from '../src/modules/auth/oauth/google-oauth-client.service.js';
import { VerificadorIdTokenGoogleService } from '../src/modules/auth/oauth/google-token-verifier.service.js';
import { SesionAdmin } from '../src/modules/auth/entities/sesion-admin.entity.js';

const ADMINISTRADOR_ID = '11111111-1111-1111-1111-111111111111';
const ADMINISTRADOR_EMAIL = 'administrador@fundacionfenix.org';
const REDIRECCION_PERMITIDA = 'http://localhost:5173/admin';

interface SesionAlmacenada {
  id: string;
  administradorId: string;
  tokenHash: string;
  csrfToken: string;
  creadaEn: Date;
  tokenEmitidoEn: Date;
  ultimaActividadEn: Date;
  expiraEn: Date;
  revocadaEn: Date | null;
  motivoRevocacion: string | null;
}

/**
 * Almacén en memoria que imita a PostgreSQL para la tabla de sesiones. Las
 * pruebas E2E nunca contactan con Supabase ni con ninguna base de datos real.
 */
class AlmacenSesionesFalso {
  readonly sesiones = new Map<string, SesionAlmacenada>();
  falloEnLectura: Error | null = null;
  falloEnEscritura: Error | null = null;

  crear(entidad: Partial<SesionAlmacenada>): SesionAlmacenada {
    return {
      id: randomUUID(),
      administradorId: '',
      tokenHash: '',
      csrfToken: '',
      creadaEn: new Date(),
      tokenEmitidoEn: new Date(),
      ultimaActividadEn: new Date(),
      expiraEn: new Date(),
      revocadaEn: null,
      motivoRevocacion: null,
      ...entidad,
    } as SesionAlmacenada;
  }

  async guardar(entidad: SesionAlmacenada): Promise<SesionAlmacenada> {
    if (this.falloEnEscritura) {
      throw this.falloEnEscritura;
    }

    this.sesiones.set(entidad.id, { ...entidad });
    return entidad;
  }

  async buscarPorTokenHash(
    tokenHash: string,
  ): Promise<SesionAlmacenada | null> {
    if (this.falloEnLectura) {
      throw this.falloEnLectura;
    }

    for (const sesion of this.sesiones.values()) {
      if (sesion.tokenHash === tokenHash) {
        return { ...sesion };
      }
    }

    return null;
  }

  async actualizar(
    id: string,
    parcial: Partial<SesionAlmacenada>,
  ): Promise<{ affected: number | undefined }> {
    if (this.falloEnEscritura) {
      throw this.falloEnEscritura;
    }

    const sesion = this.sesiones.get(id);
    if (!sesion) {
      return { affected: 0 };
    }

    this.sesiones.set(id, { ...sesion, ...parcial });
    return { affected: 1 };
  }
}

describe('sesiones administrativas (e2e)', () => {
  let app: INestApplication<App>;
  let almacen: AlmacenSesionesFalso;
  let administradorActivo: Record<string, unknown>;
  let actualizacionesAdministrador: Array<Record<string, unknown>>;
  let construirUrlAutorizacion: ReturnType<typeof vi.fn>;
  let canjearCodigo: ReturnType<typeof vi.fn>;
  let verificar: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    almacen = new AlmacenSesionesFalso();
    actualizacionesAdministrador = [];
    administradorActivo = {
      id: ADMINISTRADOR_ID,
      email: ADMINISTRADOR_EMAIL,
      nombre: 'Administración FÉNIX',
      googleSub: 'sub-google-1',
      activo: true,
      ultimoAcceso: null,
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    };

    construirUrlAutorizacion = vi
      .fn()
      .mockImplementation(
        async (params: { state: string }) =>
          new URL(
            `https://accounts.google.com/o/oauth2/v2/auth?state=${params.state}&scope=openid+email+profile`,
          ),
      );
    canjearCodigo = vi.fn().mockResolvedValue({ idToken: 'id-token-ficticio' });
    verificar = vi.fn().mockResolvedValue({
      sub: 'sub-google-1',
      email: ADMINISTRADOR_EMAIL,
      emailVerified: true,
    });

    const repositorioSesiones = {
      create: (entidad: Partial<SesionAlmacenada>) => almacen.crear(entidad),
      save: (entidad: SesionAlmacenada) => almacen.guardar(entidad),
      findOne: (opciones: { where: { tokenHash: string } }) =>
        almacen.buscarPorTokenHash(opciones.where.tokenHash),
      update: (id: string, parcial: Partial<SesionAlmacenada>) =>
        almacen.actualizar(id, parcial),
    };

    const repositorioAdministradores = {
      findOne: (opciones: { where: { email?: string; id?: string } }) => {
        if (opciones.where.email) {
          return administradorActivo.email === opciones.where.email
            ? administradorActivo
            : null;
        }

        if (opciones.where.id) {
          return administradorActivo.id === opciones.where.id
            ? administradorActivo
            : null;
        }

        return null;
      },
      update: (
        criterio: string,
        parcial: Record<string, unknown>,
      ): Promise<{ affected: number }> => {
        actualizacionesAdministrador.push({ criterio, ...parcial });
        return Promise.resolve({ affected: 1 });
      },
    };

    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue({
        destroy: vi.fn().mockResolvedValue(undefined),
        entityMetadatas: [],
        getRepository: vi.fn().mockImplementation((entidad: unknown) => {
          if (entidad === SesionAdmin) {
            return repositorioSesiones;
          }

          if (entidad === Administrador) {
            return repositorioAdministradores;
          }

          return {};
        }),
        isInitialized: true,
        options: { type: 'postgres' },
        query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .overrideProvider(ClienteOAuthGoogleService)
      .useValue({ construirUrlAutorizacion, canjearCodigo })
      .overrideProvider(VerificadorIdTokenGoogleService)
      .useValue({ verificar })
      .compile();

    app = modulo.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  /** Realiza el flujo de login completo y devuelve la cookie de sesión. */
  async function iniciarSesion(): Promise<{
    cookie: string;
    token: string;
    csrfToken: string;
  }> {
    const inicio = await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(302);

    const cookieTransaccion =
      (inicio.headers['set-cookie'] ?? [])
        .find((c) => c.startsWith('fenix_oauth_tx'))
        ?.split(';')[0] ?? '';
    const state = new URL(inicio.headers.location as string).searchParams.get(
      'state',
    );

    const respuesta = await request(app.getHttpServer())
      .get('/api/auth/google/callback')
      .query({ code: 'codigo-de-autorizacion', state })
      .set('Cookie', cookieTransaccion)
      .expect(302);

    const cabecera = (respuesta.headers['set-cookie'] ?? []).find((c) =>
      c.startsWith('fenix_session='),
    );
    const token = cabecera?.split(';')[0]?.split('=')[1] ?? '';

    const sesion = [...almacen.sesiones.values()].find(
      (s) =>
        s.tokenHash ===
        createHash('sha256').update(token, 'utf8').digest('hex'),
    );

    return {
      cookie: `fenix_session=${token}`,
      token,
      csrfToken: sesion?.csrfToken ?? '',
    };
  }

  describe('inicio de sesión', () => {
    it('crea la sesión, establece la cookie y redirige al frontend permitido', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/google')
        .expect(302);

      const cookieTransaccion =
        (respuesta.headers['set-cookie'] ?? [])
          .find((c) => c.startsWith('fenix_oauth_tx'))
          ?.split(';')[0] ?? '';
      const state = new URL(
        respuesta.headers.location as string,
      ).searchParams.get('state');

      const callback = await request(app.getHttpServer())
        .get('/api/auth/google/callback')
        .query({ code: 'codigo-de-autorizacion', state })
        .set('Cookie', cookieTransaccion)
        .expect(302);

      expect(callback.headers.location).toBe(REDIRECCION_PERMITIDA);

      const cabecera = (callback.headers['set-cookie'] ?? []).find((c) =>
        c.startsWith('fenix_session='),
      );
      expect(cabecera).toBeDefined();
      expect(cabecera).toContain('HttpOnly');
      expect(cabecera).toContain('SameSite=Lax');
      expect(cabecera).toContain('Path=/api');

      const valor = cabecera?.split(';')[0]?.split('=')[1] ?? '';
      expect(valor).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(cabecera).not.toContain('access_token');
      expect(cabecera).not.toContain('id_token');
      expect(cabecera).not.toContain('sub-google-1');

      expect(almacen.sesiones.size).toBe(1);
      const sesion = [...almacen.sesiones.values()][0];
      expect(sesion.administradorId).toBe(ADMINISTRADOR_ID);
      expect(sesion.tokenHash).toBe(
        createHash('sha256').update(valor, 'utf8').digest('hex'),
      );
      expect(sesion.revocadaEn).toBeNull();
    });

    it('actualiza el último acceso del administrador', async () => {
      actualizacionesAdministrador.length = 0;
      await iniciarSesion();

      expect(actualizacionesAdministrador).toHaveLength(1);
      expect(actualizacionesAdministrador[0].criterio).toBe(ADMINISTRADOR_ID);
      expect(actualizacionesAdministrador[0].ultimoAcceso).toBeInstanceOf(Date);
    });

    it('ignora una redirección externa enviada por el navegador', async () => {
      const inicio = await request(app.getHttpServer())
        .get('/api/auth/google')
        .expect(302);

      const cookieTransaccion =
        (inicio.headers['set-cookie'] ?? [])
          .find((c) => c.startsWith('fenix_oauth_tx'))
          ?.split(';')[0] ?? '';
      const state = new URL(inicio.headers.location as string).searchParams.get(
        'state',
      );

      const callback = await request(app.getHttpServer())
        .get('/api/auth/google/callback')
        .query({
          code: 'codigo-de-autorizacion',
          state,
          redirect: 'https://sitio-malicioso.example/robo',
        })
        .set('Cookie', cookieTransaccion)
        .expect(302);

      expect(callback.headers.location).toBe(REDIRECCION_PERMITIDA);
      expect(callback.headers.location).not.toContain('sitio-malicioso');
    });

    it('no concede acceso si el almacenamiento de sesiones falla', async () => {
      almacen.falloEnEscritura = new Error('conexión rechazada');

      const inicio = await request(app.getHttpServer())
        .get('/api/auth/google')
        .expect(302);

      const cookieTransaccion =
        (inicio.headers['set-cookie'] ?? [])
          .find((c) => c.startsWith('fenix_oauth_tx'))
          ?.split(';')[0] ?? '';
      const state = new URL(inicio.headers.location as string).searchParams.get(
        'state',
      );

      const callback = await request(app.getHttpServer())
        .get('/api/auth/google/callback')
        .query({ code: 'codigo-de-autorizacion', state })
        .set('Cookie', cookieTransaccion)
        .expect(503);

      const cabeceras = callback.headers['set-cookie'] ?? [];
      expect(
        cabeceras.find((c) => c.startsWith('fenix_session=')),
      ).toBeUndefined();

      almacen.falloEnEscritura = null;
    });
  });

  describe('consulta de sesión actual', () => {
    it('devuelve únicamente información mínima con la sesión válida', async () => {
      const { cookie } = await iniciarSesion();

      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(200);

      expect(respuesta.body).toMatchObject({
        autenticado: true,
        administrador: {
          id: ADMINISTRADOR_ID,
          nombre: 'Administración FÉNIX',
        },
      });
      expect(respuesta.body.administrador).not.toHaveProperty('email');
      expect(respuesta.body.administrador).not.toHaveProperty('googleSub');
      expect(respuesta.body).not.toHaveProperty('token');
      expect(respuesta.body).not.toHaveProperty('sesionId');
      expect(respuesta.headers['cache-control']).toBe('no-store');

      const cuerpo = JSON.stringify(respuesta.body);
      expect(cuerpo).not.toContain('sub-google-1');
      expect(cuerpo).not.toContain(ADMINISTRADOR_EMAIL);
      expect(cuerpo).not.toContain('access_token');
      expect(cuerpo).not.toContain('id_token');
    });

    it('responde 401 sin sesión', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(respuesta.body).toMatchObject({ statusCode: 401 });
    });

    it('responde 401 con una cookie alterada', async () => {
      const { token } = await iniciarSesion();
      const alterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `fenix_session=${alterado}`)
        .expect(401);
    });

    it('responde 401 con una sesión caducada', async () => {
      const { token } = await iniciarSesion();
      const sesion = [...almacen.sesiones.values()].find(
        (s) =>
          s.tokenHash ===
          createHash('sha256').update(token, 'utf8').digest('hex'),
      );

      if (sesion) {
        sesion.expiraEn = new Date(Date.now() - 1_000);
        almacen.sesiones.set(sesion.id, sesion);
      }

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `fenix_session=${token}`)
        .expect(401);
    });

    it('responde 401 con una sesión revocada', async () => {
      const { token } = await iniciarSesion();
      const sesion = [...almacen.sesiones.values()].find(
        (s) =>
          s.tokenHash ===
          createHash('sha256').update(token, 'utf8').digest('hex'),
      );

      if (sesion) {
        sesion.revocadaEn = new Date();
        sesion.motivoRevocacion = 'logout';
        almacen.sesiones.set(sesion.id, sesion);
      }

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `fenix_session=${token}`)
        .expect(401);
    });

    it('responde 403 cuando la cuenta administrativa está desactivada', async () => {
      const { cookie } = await iniciarSesion();
      administradorActivo.activo = false;

      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(403);

      expect(respuesta.body).toMatchObject({ statusCode: 403 });

      administradorActivo.activo = true;
    });

    it('responde 401 cuando la cuenta administrativa ya no existe', async () => {
      const { cookie } = await iniciarSesion();
      const original = administradorActivo.id;
      administradorActivo.id = '33333333-3333-3333-3333-333333333333';

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(401);

      administradorActivo.id = original;
    });

    it('responde 503 cuando PostgreSQL no está disponible', async () => {
      const { cookie } = await iniciarSesion();
      almacen.falloEnLectura = new Error('conexión rechazada');

      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(503);

      expect(respuesta.body).toMatchObject({ statusCode: 503 });
      expect(JSON.stringify(respuesta.body)).not.toContain(
        'conexión rechazada',
      );

      almacen.falloEnLectura = null;
    });

    it('renueva el identificador de sesión cuando corresponde', async () => {
      const { token } = await iniciarSesion();
      const hash = createHash('sha256').update(token, 'utf8').digest('hex');
      const sesion = [...almacen.sesiones.values()].find(
        (s) => s.tokenHash === hash,
      );

      if (sesion) {
        sesion.tokenEmitidoEn = new Date(Date.now() - 400 * 1_000);
        almacen.sesiones.set(sesion.id, sesion);
      }

      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `fenix_session=${token}`)
        .expect(200);

      const cabecera = (respuesta.headers['set-cookie'] ?? []).find((c) =>
        c.startsWith('fenix_session='),
      );
      expect(cabecera).toBeDefined();

      const nuevoToken = cabecera?.split(';')[0]?.split('=')[1] ?? '';
      expect(nuevoToken).not.toBe(token);
      expect(nuevoToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `fenix_session=${token}`)
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', `fenix_session=${nuevoToken}`)
        .expect(200);
    });
  });

  describe('cierre de sesión', () => {
    it('invalida la sesión en el servidor y elimina la cookie', async () => {
      const { cookie, csrfToken } = await iniciarSesion();

      const respuesta = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .expect(204);

      const cabecera = (respuesta.headers['set-cookie'] ?? []).find((c) =>
        c.startsWith('fenix_session='),
      );
      expect(cabecera).toBeDefined();
      expect(cabecera).toContain('Path=/api');
      expect(cabecera).toMatch(/Expires=Thu, 01 Jan 1970/i);

      const sesion = [...almacen.sesiones.values()].find(
        (s) => s.revocadaEn !== null,
      );
      expect(sesion?.motivoRevocacion).toBe('logout');
    });

    it('impide reutilizar la cookie después del cierre de sesión', async () => {
      const { cookie, csrfToken } = await iniciarSesion();

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/admin/health')
        .set('Cookie', cookie)
        .expect(401);
    });

    it('responde 401 cuando no hay sesión activa', async () => {
      const respuesta = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);

      expect(respuesta.body).toMatchObject({ statusCode: 401 });
    });

    it('exige el token anti-CSRF', async () => {
      const { cookie } = await iniciarSesion();

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'token-inventado')
        .expect(403);

      // La sesión sigue vigente: el rechazo es del token anti-CSRF, no de la sesión.
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .expect(200);
    });
  });

  describe('endpoint privado de comprobación', () => {
    it('responde sólo para un administrador autenticado y autorizado', async () => {
      const { cookie } = await iniciarSesion();

      const respuesta = await request(app.getHttpServer())
        .get('/api/admin/health')
        .set('Cookie', cookie)
        .expect(200);

      expect(respuesta.body).toMatchObject({
        status: 'ok',
        administrador: {
          id: ADMINISTRADOR_ID,
          nombre: 'Administración FÉNIX',
        },
      });

      const cuerpo = JSON.stringify(respuesta.body);
      expect(cuerpo).not.toContain('supabase');
      expect(cuerpo).not.toContain('postgresql://');
      expect(cuerpo).not.toContain('sub-google-1');
      expect(cuerpo).not.toContain('fenix_session');
    });

    it('responde 401 sin sesión', async () => {
      await request(app.getHttpServer()).get('/api/admin/health').expect(401);
    });

    it('responde 403 con una cuenta desactivada', async () => {
      const { cookie } = await iniciarSesion();
      administradorActivo.activo = false;

      await request(app.getHttpServer())
        .get('/api/admin/health')
        .set('Cookie', cookie)
        .expect(403);

      administradorActivo.activo = true;
    });
  });

  describe('protección CSRF', () => {
    it('exige el token anti-CSRF en las operaciones de escritura', async () => {
      const { cookie, csrfToken } = await iniciarSesion();

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .expect(204);
    });

    it('rechaza un origen no autorizado en las operaciones de escritura', async () => {
      const { cookie, csrfToken } = await iniciarSesion();

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .set('Origin', 'https://sitio-no-autorizado.example')
        .expect(403);
    });

    it('admite un origen autorizado en las operaciones de escritura', async () => {
      const { cookie, csrfToken } = await iniciarSesion();

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken)
        .set('Origin', 'http://localhost:5173')
        .expect(204);
    });
  });

  describe('CORS', () => {
    it('no devuelve cabeceras CORS para un origen no autorizado', async () => {
      const { cookie } = await iniciarSesion();

      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .set('Origin', 'https://sitio-no-autorizado.example')
        .expect(200);

      expect(respuesta.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('devuelve las cabeceras CORS para un origen autorizado', async () => {
      const { cookie } = await iniciarSesion();

      const respuesta = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(respuesta.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      expect(respuesta.headers['access-control-allow-credentials']).toBe(
        'true',
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
