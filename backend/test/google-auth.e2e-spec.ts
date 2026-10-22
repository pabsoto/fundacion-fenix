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
import { ClienteOAuthGoogleService } from '../src/modules/auth/oauth/google-oauth-client.service.js';
import { VerificadorIdTokenGoogleService } from '../src/modules/auth/oauth/google-token-verifier.service.js';
import { Administrador } from '../src/modules/administradores/entities/administrador.entity.js';
import { SesionAdmin } from '../src/modules/auth/entities/sesion-admin.entity.js';

describe('autenticación administrativa con Google (e2e)', () => {
  let app: INestApplication<App>;
  let construirUrlAutorizacion: ReturnType<typeof vi.fn>;
  let canjearCodigo: ReturnType<typeof vi.fn>;
  let verificar: ReturnType<typeof vi.fn>;
  const sesionesCreadas: Array<Record<string, unknown>> = [];

  const administrador = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'administrador@fundacionfenix.org',
    nombre: 'Administración FÉNIX',
    googleSub: 'sub-google-1',
    activo: true,
    ultimoAcceso: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeAll(async () => {
    construirUrlAutorizacion = vi
      .fn()
      .mockImplementation(
        async (params: { state: string; nonce: string }) =>
          new URL(
            `https://accounts.google.com/o/oauth2/v2/auth?state=${params.state}&nonce=${params.nonce}&scope=openid+email+profile`,
          ),
      );
    canjearCodigo = vi.fn().mockResolvedValue({ idToken: 'id-token-ficticio' });
    verificar = vi.fn().mockResolvedValue({
      sub: 'sub-google-1',
      email: 'administrador@fundacionfenix.org',
      emailVerified: true,
    });

    const repositorioSesiones = {
      create: (entidad: Record<string, unknown>) => ({
        id: randomUUID(),
        ...entidad,
      }),
      save: async (entidad: Record<string, unknown>) => {
        sesionesCreadas.push(entidad);
        return entidad;
      },
      findOne: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue({
        destroy: vi.fn().mockResolvedValue(undefined),
        entityMetadatas: [],
        getRepository: vi.fn().mockImplementation((entidad: unknown) => {
          if (entidad === Administrador) {
            return {
              findOne: vi.fn().mockResolvedValue(administrador),
              update: vi.fn(),
            };
          }

          if (entidad === SesionAdmin) {
            return repositorioSesiones;
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

  it('inicia el flujo y redirige a Google sin exponer tokens', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(302);

    const ubicacion = respuesta.headers.location as string;
    expect(ubicacion).toContain('https://accounts.google.com/');
    expect(ubicacion).toContain('scope=openid+email+profile');
    expect(ubicacion).not.toContain('access_type=offline');
    expect(ubicacion).not.toContain('access_token');
    expect(respuesta.headers['set-cookie']?.[0]).toContain('fenix_oauth_tx');
    expect(respuesta.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('completa el flujo, crea la sesión y redirige al frontend permitido', async () => {
    const inicio = await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(302);

    const cookie = (inicio.headers['set-cookie'] ?? [])[0]?.split(';')[0] ?? '';
    const state = new URL(inicio.headers.location as string).searchParams.get(
      'state',
    );

    const respuesta = await request(app.getHttpServer())
      .get('/api/auth/google/callback')
      .query({ code: 'codigo-de-autorizacion', state })
      .set('Cookie', cookie)
      .expect(302);

    expect(respuesta.headers.location).toBe('http://localhost:5173/admin');

    const cabeceraSesion = (respuesta.headers['set-cookie'] ?? []).find((c) =>
      c.startsWith('fenix_session='),
    );
    expect(cabeceraSesion).toBeDefined();
    expect(cabeceraSesion).toContain('HttpOnly');
    expect(cabeceraSesion).toContain('SameSite=Lax');
    expect(cabeceraSesion).toContain('Path=/api');

    const token = cabeceraSesion?.split(';')[0]?.split('=')[1] ?? '';
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // El identificador de sesión se persiste sólo como resumen SHA-256.
    expect(sesionesCreadas).toHaveLength(1);
    expect(sesionesCreadas[0].tokenHash).toBe(
      createHash('sha256').update(token, 'utf8').digest('hex'),
    );
    expect(JSON.stringify(sesionesCreadas[0])).not.toContain(token);
    expect(sesionesCreadas[0].administradorId).toBe(administrador.id);

    const cabeceras = JSON.stringify(respuesta.headers);
    expect(cabeceras).not.toContain('id_token');
    expect(cabeceras).not.toContain('access_token');
    expect(cabeceras).not.toContain('codigo-de-autorizacion');
    expect(cabeceras).not.toContain('sub-google-1');
    expect(cabeceras).not.toContain(administrador.email);
  });

  it('rechaza un callback sin la cookie de transacción', async () => {
    const inicio = await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(302);

    const state = new URL(inicio.headers.location as string).searchParams.get(
      'state',
    );

    const respuesta = await request(app.getHttpServer())
      .get('/api/auth/google/callback')
      .query({ code: 'codigo-de-autorizacion', state })
      .expect(400);

    expect(respuesta.body).toMatchObject({ statusCode: 400 });
    expect(JSON.stringify(respuesta.body)).not.toContain(
      'codigo-de-autorizacion',
    );
  });

  it('rechaza un state inválido o ausente', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/google/callback')
      .query({ code: 'codigo-de-autorizacion', state: 'state-inventado' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/auth/google/callback')
      .query({ code: 'codigo-de-autorizacion' })
      .expect(400);
  });

  it('rechaza la cancelación del proceso en Google', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/auth/google/callback')
      .query({ error: 'access_denied' })
      .expect(400);

    expect(respuesta.body).toMatchObject({ statusCode: 400 });
  });

  afterAll(async () => {
    await app.close();
  });
});
