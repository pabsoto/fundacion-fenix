import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/config/configure-application.js';
import {
  configureSwagger,
  OPENAPI_JSON_PATH,
  SWAGGER_UI_PATH,
} from '../src/config/swagger.js';

describe('application bootstrap (e2e)', () => {
  let app: INestApplication<App>;
  const databaseQuery = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue({
        destroy: vi.fn().mockResolvedValue(undefined),
        entityMetadatas: [],
        getRepository: vi.fn(),
        isInitialized: true,
        options: { type: 'postgres' },
        query: databaseQuery,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    configureSwagger(app, app.get(ConfigService));
    await app.init();
  });

  it('reports application health under the global prefix', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
    expect(new Date(response.body.timestamp).toString()).not.toBe(
      'Invalid Date',
    );
  });

  it('reports service unavailable without exposing database error details', async () => {
    databaseQuery.mockRejectedValueOnce(
      new Error('secret internal database connection detail'),
    );

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);

    expect(response.body).toMatchObject({
      status: 'error',
      database: 'down',
    });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('uses the consistent error response', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/no-existe')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      path: '/api/no-existe',
    });
    expect(response.body.message).toBeTypeOf('string');
  });

  it('allows credentials only for a configured origin', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:5173')
      .expect('Access-Control-Allow-Origin', 'http://localhost:5173')
      .expect('Access-Control-Allow-Credentials', 'true')
      .expect(200);

    const rejectedOrigin = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://example.invalid')
      .expect(200);

    expect(
      rejectedOrigin.headers['access-control-allow-origin'],
    ).toBeUndefined();
  });

  it('serves Swagger UI and a complete OpenAPI document in development', async () => {
    await request(app.getHttpServer())
      .get(`/${SWAGGER_UI_PATH}`)
      .expect(200)
      .expect('Content-Type', /text\/html/);

    const response = await request(app.getHttpServer())
      .get(`/${OPENAPI_JSON_PATH}`)
      .expect(200)
      .expect('Content-Type', /json/);

    const document = response.body as {
      openapi: string;
      paths: Record<string, Record<string, unknown>>;
      components: { securitySchemes: Record<string, unknown> };
    };
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths).sort()).toEqual(
      [
        '/api/admin/donaciones',
        '/api/admin/health',
        '/api/auth/google',
        '/api/auth/google/callback',
        '/api/auth/logout',
        '/api/auth/me',
        '/api/health',
        '/api/public/contactos',
        '/api/public/donaciones',
        '/api/public/institucional',
      ].sort(),
    );
    expect(document.paths['/api/admin/donaciones']).toHaveProperty('get');
    expect(document.paths['/api/admin/donaciones']).toHaveProperty('put');
    expect(document.components.securitySchemes).toMatchObject({
      cookieAuth: { type: 'apiKey', in: 'cookie' },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
      },
    });
    expect(document.paths['/api/admin/donaciones'].put).toMatchObject({
      security: [{ cookieAuth: [], csrfToken: [] }],
    });
    expect(document.paths['/api/public/donaciones'].get).not.toHaveProperty(
      'security',
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
