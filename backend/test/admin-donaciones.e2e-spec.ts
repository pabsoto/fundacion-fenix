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
import { StorageService } from '../src/modules/storage/storage.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]),
]);

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
  let falloStorage: boolean;

  const subirStorage = vi.fn(async () => {
    if (falloStorage) throw new Error('detalle secreto de Storage');
  });
  const eliminarStorage = vi.fn().mockResolvedValue(undefined);
  const obtenerUrlPublica = vi.fn(
    (ruta: string) =>
      `https://proyecto.supabase.co/storage/v1/object/public/fenix-donaciones/${ruta}`,
  );

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
      .overrideProvider(StorageService)
      .useValue({
        subir: subirStorage,
        eliminar: eliminarStorage,
        obtenerUrlPublica,
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
    falloStorage = false;
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
      qr: { disponible: true, venceEl: '2027-06-30' },
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

  it('sube y reemplaza el QR conservando los datos bancarios y auditando', async () => {
    const original = crearDonacion({
      qrRuta: 'qr/anterior/archivo.png',
      qrVenceEl: '2026-12-31',
    });
    donaciones = [original];

    const respuesta = await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .field('qrVenceEl', '2099-12-31')
      .attach('archivo', PNG, {
        filename: 'qr.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(respuesta.body).toEqual({
      qr: { disponible: true, venceEl: '2099-12-31' },
    });
    expect(donaciones[0]).toMatchObject({
      id: original.id,
      banco: 'Banco anterior',
      qrVenceEl: '2099-12-31',
      actualizadoPorId: ADMIN_ID,
    });
    expect(donaciones[0].qrRuta).toMatch(/^qr\/.+\/.+\.png$/);
    expect(subirStorage).toHaveBeenCalledWith(
      donaciones[0].qrRuta,
      expect.any(Buffer),
      'image/png',
    );
    expect(eliminarStorage).toHaveBeenCalledWith('qr/anterior/archivo.png');
    expect(auditorias[0]).toMatchObject({
      administradorId: ADMIN_ID,
      accion: 'UPDATE',
      datosAntes: expect.objectContaining({
        qr_ruta: 'qr/anterior/archivo.png',
      }),
      datosDespues: expect.objectContaining({ qr_ruta: donaciones[0].qrRuta }),
    });

    const publica = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);
    expect(publica.body.donacion.qrUrl).toContain(donaciones[0].qrRuta);
    expect(publica.body.donacion).not.toHaveProperty('qrRuta');
  });

  it('rechaza una imagen inválida y un archivo mayor a 2 MB', async () => {
    donaciones = [crearDonacion()];
    await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', Buffer.from('<svg/>'), {
        filename: 'qr.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', Buffer.alloc(2 * 1024 * 1024 + 1), {
        filename: 'qr.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(subirStorage).not.toHaveBeenCalled();
  });

  it('protege la subida con sesión y CSRF', async () => {
    donaciones = [crearDonacion()];
    await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', PNG, 'qr.png')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', 'invalido')
      .attach('archivo', PNG, 'qr.png')
      .expect(403);
  });

  it('exige datos bancarios antes de subir el QR', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', PNG, {
        filename: 'qr.png',
        contentType: 'image/png',
      })
      .expect(404);
    expect(respuesta.body.message).toContain('datos bancarios');
  });

  it('no cambia PostgreSQL si falla Storage', async () => {
    const original = crearDonacion();
    donaciones = [original];
    falloStorage = true;
    const respuesta = await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', PNG, {
        filename: 'qr.png',
        contentType: 'image/png',
      })
      .expect(503);
    expect(donaciones[0].qrRuta).toBe('donaciones/qr-preservado.png');
    expect(auditorias).toHaveLength(0);
    expect(JSON.stringify(respuesta.body)).not.toContain('detalle secreto');
  });

  it('revierte PostgreSQL y limpia el archivo nuevo si falla la auditoría', async () => {
    donaciones = [crearDonacion({ qrRuta: null, qrVenceEl: null })];
    falloAuditoria = true;
    await request(app.getHttpServer())
      .post('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', PNG, {
        filename: 'qr.png',
        contentType: 'image/png',
      })
      .expect(503);
    expect(donaciones[0].qrRuta).toBeNull();
    expect(auditorias).toHaveLength(0);
    expect(eliminarStorage).toHaveBeenCalledWith(
      expect.stringMatching(/^qr\/.+\/.+\.png$/),
    );
  });

  it('oculta el QR vencido y publica el vigente conservando el contrato', async () => {
    donaciones = [
      crearDonacion({
        qrRuta: 'qr/id/archivo.png',
        qrVenceEl: '2020-01-01',
      }),
    ];
    const vencido = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);
    expect(vencido.body.donacion.qrUrl).toBeNull();

    donaciones[0].qrVenceEl = '2099-12-31';
    const vigente = await request(app.getHttpServer())
      .get('/api/public/donaciones')
      .expect(200);
    expect(vigente.body.donacion).toMatchObject({
      titular: 'Fundación FÉNIX LPB',
      banco: 'Banco anterior',
      qrUrl: expect.stringContaining('/qr/id/archivo.png'),
    });
    expect(vigente.body.donacion).not.toHaveProperty('qrRuta');
  });

  it('retira el QR con CSRF, auditoría y sin borrar datos bancarios', async () => {
    donaciones = [crearDonacion()];
    const respuesta = await request(app.getHttpServer())
      .delete('/api/admin/donaciones/qr')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .expect(200);

    expect(respuesta.body).toEqual({
      qr: { disponible: false, venceEl: null },
    });
    expect(donaciones[0]).toMatchObject({
      banco: 'Banco anterior',
      qrRuta: null,
      qrVenceEl: null,
    });
    expect(auditorias[0]).toMatchObject({
      accion: 'UPDATE',
      camposModificados: expect.arrayContaining(['qr_ruta', 'qr_vence_el']),
    });
    expect(eliminarStorage).toHaveBeenCalledWith(
      'donaciones/qr-preservado.png',
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
