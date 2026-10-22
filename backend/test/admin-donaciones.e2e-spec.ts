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
import { DatoDonacion } from '../src/modules/donaciones/entities/dato-donacion.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';

const cuerpoValido = {
  titular: 'Fundación FÉNIX LPB',
  banco: 'Banco oficial',
  telefono: '+591 70000000',
  referencia: 'Donación institucional',
  numeroCuenta: '123-456',
  avisoEs: 'Verifique el titular',
  avisoEn: 'Verify the account holder',
};

function crearDonacion(cambios: Partial<DatoDonacion> = {}): DatoDonacion {
  return {
    id: randomUUID(),
    titular: 'Fundación FÉNIX LPB',
    banco: 'Banco anterior',
    telefono: '70000000',
    referencia: 'Donación',
    numeroCuenta: '000-111',
    qrRuta: 'donaciones/qr-preservado.png',
    qrVenceEl: '2027-06-30',
    avisoEs: 'Aviso anterior',
    avisoEn: 'Previous notice',
    activo: true,
    creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    creadoPor: null,
    actualizadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  };
}

function clonarDonaciones(donaciones: DatoDonacion[]): DatoDonacion[] {
  return donaciones.map((dato) => Object.assign(new DatoDonacion(), dato));
}

describe('administración de donaciones (e2e)', () => {
  let app: INestApplication<App>;
  let donaciones: DatoDonacion[];
  let auditorias: Array<Partial<Auditoria>>;
  let administradorActivo: boolean;
  let falloPostgres: boolean;
  let falloAuditoria: boolean;

  const repositorioLectura = {
    find: vi.fn(async () => {
      if (falloPostgres) throw new Error('servidor PostgreSQL secreto');
      return donaciones.filter((dato) => dato.activo).slice(0, 2);
    }),
  };

  const repositorioDonacionesTransaccion = {
    find: vi.fn(async () =>
      donaciones.filter((dato) => dato.activo).slice(0, 2),
    ),
    create: vi.fn((datos: Partial<DatoDonacion>) =>
      crearDonacion({
        ...datos,
        id: randomUUID(),
        qrRuta: null,
        qrVenceEl: null,
        creadoPor: null,
        actualizadoPor: null,
      }),
    ),
    save: vi.fn(async (dato: DatoDonacion) => {
      const indice = donaciones.findIndex((actual) => actual.id === dato.id);
      if (indice === -1) donaciones.push(dato);
      else donaciones[indice] = dato;
      return dato;
    }),
  };

  const repositorioAuditoriaTransaccion = {
    create: vi.fn((datos: Partial<Auditoria>) => ({
      id: randomUUID(),
      creadoEn: new Date(),
      ...datos,
    })),
    save: vi.fn(async (auditoria: Partial<Auditoria>) => {
      if (falloAuditoria) throw new Error('fallo intencional de auditoría');
      auditorias.push(auditoria);
      return auditoria;
    }),
  };

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === DatoDonacion
        ? repositorioDonacionesTransaccion
        : repositorioAuditoriaTransaccion,
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
      async (
        _aislamiento: string,
        operacion: (entityManager: typeof manager) => Promise<unknown>,
      ) => {
        if (falloPostgres) throw new Error('servidor PostgreSQL secreto');
        const donacionesAntes = clonarDonaciones(donaciones);
        const auditoriasAntes = [...auditorias];
        try {
          return await operacion(manager);
        } catch (error) {
          donaciones = donacionesAntes;
          auditorias = auditoriasAntes;
          throw error;
        }
      },
    ),
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(DatoDonacion))
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
                administrador: {
                  id: ADMIN_ID,
                  nombre: 'Administración FÉNIX',
                },
              }
            : { estado: 'inactivo' },
        ),
      })
      .compile();

    app = modulo.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  beforeEach(() => {
    donaciones = [];
    auditorias = [];
    administradorActivo = true;
    falloPostgres = false;
    falloAuditoria = false;
    vi.clearAllMocks();
  });

  it('permite consultar la configuración con una sesión activa', async () => {
    donaciones = [crearDonacion()];
    const respuesta = await request(app.getHttpServer())
      .get('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .expect(200);

    expect(respuesta.body.donacion).toMatchObject({
      titular: 'Fundación FÉNIX LPB',
      banco: 'Banco anterior',
      activo: true,
    });
    expect(respuesta.body.donacion).not.toHaveProperty('creadoPorId');
    expect(respuesta.body.donacion).not.toHaveProperty('actualizadoPorId');
  });

  it('devuelve una configuración ausente de forma coherente', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .expect(200);
    expect(respuesta.body).toEqual({ donacion: null });
  });

  it('rechaza GET sin sesión', async () => {
    await request(app.getHttpServer()).get('/api/admin/donaciones').expect(401);
  });

  it('rechaza un administrador desactivado', async () => {
    administradorActivo = false;
    await request(app.getHttpServer())
      .get('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(403);
  });

  it('crea la primera configuración con CSRF y registra la auditoría', async () => {
    const respuesta = await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(200);

    expect(respuesta.body).toMatchObject({
      accion: 'INSERT',
      donacion: { ...cuerpoValido, activo: true },
    });
    expect(donaciones).toHaveLength(1);
    expect(donaciones[0]).toMatchObject({
      activo: true,
      creadoPorId: ADMIN_ID,
      actualizadoPorId: ADMIN_ID,
      qrRuta: null,
      qrVenceEl: null,
    });
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0]).toMatchObject({
      administradorId: ADMIN_ID,
      tabla: 'datos_donacion',
      registroId: donaciones[0].id,
      accion: 'INSERT',
      datosAntes: null,
    });
  });

  it('actualiza la configuración y conserva los campos QR', async () => {
    const original = crearDonacion();
    donaciones = [original];

    const respuesta = await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(200);

    expect(respuesta.body.accion).toBe('UPDATE');
    expect(donaciones).toHaveLength(1);
    expect(donaciones[0]).toMatchObject({
      id: original.id,
      qrRuta: 'donaciones/qr-preservado.png',
      qrVenceEl: '2027-06-30',
      creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      actualizadoPorId: ADMIN_ID,
    });
    expect(auditorias[0]).toMatchObject({
      accion: 'UPDATE',
      datosAntes: expect.objectContaining({
        banco: 'Banco anterior',
        qr_ruta: 'donaciones/qr-preservado.png',
      }),
      datosDespues: expect.objectContaining({
        banco: 'Banco oficial',
        qr_ruta: 'donaciones/qr-preservado.png',
      }),
    });
  });

  it('rechaza PUT sin sesión', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(401);
  });

  it('rechaza PUT sin CSRF o con un CSRF inválido', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .send(cuerpoValido)
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', 'csrf-inventado')
      .send(cuerpoValido)
      .expect(403);
  });

  it('valida campos y no permite elegir al administrador responsable', async () => {
    const respuesta = await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send({
        ...cuerpoValido,
        titular: ' ',
        creadoPorId: ADMIN_ID,
        qrRuta: 'ruta/no-autorizada.png',
      })
      .expect(400);

    expect(respuesta.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('titular'),
        expect.stringContaining('creadoPorId'),
        expect.stringContaining('qrRuta'),
      ]),
    );
    expect(donaciones).toHaveLength(0);
  });

  it('impide operar si existen múltiples configuraciones activas', async () => {
    donaciones = [crearDonacion(), crearDonacion()];
    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(409);
    expect(donaciones).toHaveLength(2);
    expect(auditorias).toHaveLength(0);
  });

  it('revierte la donación cuando falla la auditoría', async () => {
    falloAuditoria = true;
    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(503);
    expect(donaciones).toHaveLength(0);
    expect(auditorias).toHaveLength(0);
  });

  it('actualiza inmediatamente el endpoint público después de guardar', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(200);

    const publica = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);
    expect(publica.body).toEqual({
      donacion: {
        titular: cuerpoValido.titular,
        banco: cuerpoValido.banco,
        telefono: cuerpoValido.telefono,
        referencia: cuerpoValido.referencia,
        numeroCuenta: cuerpoValido.numeroCuenta,
        aviso: { es: cuerpoValido.avisoEs, en: cuerpoValido.avisoEn },
        qrUrl: null,
      },
    });
    expect(publica.body.donacion).not.toHaveProperty('creadoPorId');
  });

  it('responde 503 sin filtrar detalles ante fallos de PostgreSQL', async () => {
    falloPostgres = true;
    const lectura = await request(app.getHttpServer())
      .get('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .expect(503);
    expect(JSON.stringify(lectura.body)).not.toContain('servidor PostgreSQL');

    const escritura = await request(app.getHttpServer())
      .put('/api/admin/donaciones')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .send(cuerpoValido)
      .expect(503);
    expect(JSON.stringify(escritura.body)).not.toContain('servidor PostgreSQL');
  });

  afterAll(async () => {
    await app.close();
  });
});
