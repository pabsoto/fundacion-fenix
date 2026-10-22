import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { FindManyOptions } from 'typeorm';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/config/configure-application.js';
import { CanalContacto } from '../src/modules/canales-contacto/entities/canal-contacto.entity.js';
import { ContenidoInstitucional } from '../src/modules/contenido-institucional/entities/contenido-institucional.entity.js';
import { DatoDonacion } from '../src/modules/donaciones/entities/dato-donacion.entity.js';

describe('API pública de contenido (e2e)', () => {
  let app: INestApplication<App>;
  let falloPostgres = false;
  let contenidos: Array<Partial<ContenidoInstitucional>>;
  let donaciones: Array<Partial<DatoDonacion>>;
  let contactos: Array<Partial<CanalContacto>>;

  const repositorioContenido = {
    find: vi.fn(async (opciones: FindManyOptions<ContenidoInstitucional>) => {
      if (falloPostgres) throw new Error('host secreto de PostgreSQL');
      return contenidos
        .filter((item) => item.visible === opciones.where?.['visible'])
        .sort(
          (a, b) =>
            (a.orden ?? 0) - (b.orden ?? 0) ||
            (a.clave ?? '').localeCompare(b.clave ?? ''),
        );
    }),
  };

  const repositorioDonaciones = {
    find: vi.fn(async (opciones: FindManyOptions<DatoDonacion>) => {
      if (falloPostgres) throw new Error('host secreto de PostgreSQL');
      return donaciones
        .filter((item) => item.activo === opciones.where?.['activo'])
        .slice(0, opciones.take);
    }),
  };

  const repositorioContactos = {
    find: vi.fn(async (opciones: FindManyOptions<CanalContacto>) => {
      if (falloPostgres) throw new Error('host secreto de PostgreSQL');
      return contactos
        .filter((item) => item.activo === opciones.where?.['activo'])
        .sort(
          (a, b) =>
            (a.orden ?? 0) - (b.orden ?? 0) ||
            (a.tipo ?? '').localeCompare(b.tipo ?? ''),
        );
    }),
  };

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
      .overrideProvider(getRepositoryToken(ContenidoInstitucional))
      .useValue(repositorioContenido)
      .overrideProvider(getRepositoryToken(DatoDonacion))
      .useValue(repositorioDonaciones)
      .overrideProvider(getRepositoryToken(CanalContacto))
      .useValue(repositorioContactos)
      .compile();

    app = modulo.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  beforeEach(() => {
    falloPostgres = false;
    contenidos = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        clave: 'historia',
        tituloEs: 'Historia',
        tituloEn: 'History',
        textoEs: 'Nuestra historia',
        textoEn: 'Our history',
        imagenRuta: null,
        orden: 20,
        visible: true,
        actualizadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      },
      {
        clave: 'mision',
        tituloEs: 'Misión',
        tituloEn: 'Mission',
        textoEs: 'Nuestra misión',
        textoEn: 'Our mission',
        imagenRuta: 'https://cdn.example/mision.jpg',
        orden: 10,
        visible: true,
      },
      {
        clave: 'borrador',
        tituloEs: 'Oculto',
        orden: 0,
        visible: false,
      },
    ];
    donaciones = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        titular: 'Fundación FÉNIX',
        banco: 'Banco oficial',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: '123-456',
        avisoEs: 'Verifique el titular',
        avisoEn: 'Verify the account holder',
        qrRuta: 'bucket/ruta-interna.png',
        activo: true,
        creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      },
    ];
    contactos = [
      {
        tipo: 'facebook',
        url: 'https://facebook.com/fenix',
        textoEs: 'Facebook',
        textoEn: 'Facebook',
        orden: 20,
        activo: true,
      },
      {
        tipo: 'whatsapp',
        url: 'https://wa.me/59170000000',
        textoEs: 'Escríbenos',
        textoEn: 'Message us',
        orden: 10,
        activo: true,
      },
      {
        tipo: 'instagram',
        url: 'https://instagram.com/inactivo',
        textoEs: 'Inactivo',
        orden: 0,
        activo: false,
      },
    ];
  });

  it('devuelve contenido visible, bilingüe, ordenado y sin metadatos administrativos', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/public/institucional')
      .expect(200);

    expect(respuesta.body.map((item: { clave: string }) => item.clave)).toEqual([
      'mision',
      'historia',
    ]);
    expect(respuesta.body[0]).toEqual({
      clave: 'mision',
      titulo: { es: 'Misión', en: 'Mission' },
      descripcion: { es: 'Nuestra misión', en: 'Our mission' },
      imagenUrl: 'https://cdn.example/mision.jpg',
      orden: 10,
    });
    expect(JSON.stringify(respuesta.body)).not.toContain('borrador');
    expect(respuesta.body[1]).not.toHaveProperty('id');
    expect(respuesta.body[1]).not.toHaveProperty('actualizadoPorId');
  });

  it('devuelve la donación activa sin campos administrativos ni ruta interna del QR', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);

    expect(respuesta.body).toEqual({
      donacion: {
        titular: 'Fundación FÉNIX',
        banco: 'Banco oficial',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: '123-456',
        aviso: { es: 'Verifique el titular', en: 'Verify the account holder' },
        qrUrl: null,
      },
    });
    expect(JSON.stringify(respuesta.body)).not.toContain('ruta-interna');
    expect(respuesta.body.donacion).not.toHaveProperty('id');
    expect(respuesta.body.donacion).not.toHaveProperty('creadoPorId');
  });

  it('devuelve null si no existe una donación activa', async () => {
    donaciones = [];
    const respuesta = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);
    expect(respuesta.body).toEqual({ donacion: null });
  });

  it('no elige arbitrariamente si hay más de una donación activa', async () => {
    donaciones.push({ ...donaciones[0] });
    const respuesta = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(503);
    expect(respuesta.body.message).toContain('inconsistente');
  });

  it('devuelve contactos activos, bilingües y ordenados', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/public/contactos')
      .expect(200);

    expect(respuesta.body.map((item: { tipo: string }) => item.tipo)).toEqual([
      'whatsapp',
      'facebook',
    ]);
    expect(JSON.stringify(respuesta.body)).not.toContain('inactivo');
    expect(respuesta.body[0]).toEqual({
      tipo: 'whatsapp',
      url: 'https://wa.me/59170000000',
      texto: { es: 'Escríbenos', en: 'Message us' },
      orden: 10,
    });
  });

  it.each([
    '/api/public/institucional',
    '/api/public/donaciones',
    '/api/public/contactos',
  ])('es público y no requiere autenticación: %s', async (ruta) => {
    await request(app.getHttpServer()).get(ruta).expect(200);
  });

  it.each([
    '/api/public/institucional',
    '/api/public/donaciones',
    '/api/public/contactos',
  ])('responde 503 sin filtrar detalles cuando PostgreSQL falla: %s', async (ruta) => {
    falloPostgres = true;
    const respuesta = await request(app.getHttpServer()).get(ruta).expect(503);
    expect(JSON.stringify(respuesta.body)).not.toContain('host secreto');
  });

  it('conserva protegido el endpoint administrativo', async () => {
    await request(app.getHttpServer()).get('/api/admin/health').expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
