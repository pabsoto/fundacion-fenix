import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DonacionesPublicasController } from './donaciones-publicas.controller.js';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';

describe('DonacionesPublicasController', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [DonacionesPublicasController],
      providers: [
        {
          provide: DonacionesPublicasService,
          useValue: { obtenerActiva: async () => null },
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde Cache-Control no-cache', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);

    expect(respuesta.headers['cache-control']).toBe('no-cache');
    expect(respuesta.body).toEqual({ donacion: null });
  });
});
