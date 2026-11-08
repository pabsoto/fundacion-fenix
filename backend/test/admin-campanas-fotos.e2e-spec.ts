import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PeticionConSesion } from '../src/common/types/peticion-sesion.js';
import { configureApplication } from '../src/config/configure-application.js';
import { AutorizacionAdministradorService } from '../src/modules/administradores/services/autorizacion-administrador.service.js';
import { CookieSesionService } from '../src/modules/auth/services/cookie-sesion.service.js';
import { SesionAdminService } from '../src/modules/auth/services/sesion-admin.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { TAMANO_MAXIMO_FOTO } from '../src/modules/campanas/fotos-campana.service.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const CAMPANA_ID = 'c7d5f2a0-3b1e-4c8a-9d6f-1a2b3c4d5e6f';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';
const URL_FOTOS = `/api/admin/campanas/${CAMPANA_ID}/fotos`;
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

describe('fotos de campañas (e2e)', () => {
  let app: INestApplication<App>;
  let campanaExiste: boolean;
  let administradorActivo: boolean;

  const repositorioCampanas = {
    findOne: vi.fn(async () => (campanaExiste ? { id: CAMPANA_ID } : null)),
  };
  const repositorioFotos = {
    create: vi.fn((datos: Partial<FotoCampana>) => datos),
    save: vi.fn(async (foto: Partial<FotoCampana>) => ({
      id: '33333333-3333-3333-3333-333333333333',
      ...foto,
    })),
    createQueryBuilder: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue({ maximo: 0 }),
    })),
  };
  const storage = {
    subir: vi.fn(),
    eliminar: vi.fn(),
    obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
  };
  const dataSource = {
    destroy: vi.fn().mockResolvedValue(undefined),
    entityMetadatas: [],
    getRepository: vi.fn().mockReturnValue({}),
    isInitialized: true,
    options: { type: 'postgres' },
    query: vi.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(Campana))
      .useValue(repositorioCampanas)
      .overrideProvider(getRepositoryToken(FotoCampana))
      .useValue(repositorioFotos)
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
    campanaExiste = true;
    administradorActivo = true;
    vi.clearAllMocks();
  });

  const subir = () =>
    request(app.getHttpServer())
      .post(URL_FOTOS)
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF);

  it('rechaza subir sin sesión (401)', async () => {
    await request(app.getHttpServer())
      .post(URL_FOTOS)
      .attach('archivo', JPG, { filename: 'f.jpg', contentType: 'image/jpeg' })
      .expect(401);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza un administrador desactivado (403)', async () => {
    administradorActivo = false;
    await subir()
      .attach('archivo', JPG, { filename: 'f.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza subir sin token CSRF (403)', async () => {
    await request(app.getHttpServer())
      .post(URL_FOTOS)
      .set('Cookie', COOKIE)
      .attach('archivo', JPG, { filename: 'f.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('sube una foto válida y devuelve su URL (201)', async () => {
    const respuesta = await subir()
      .attach('archivo', JPG, { filename: 'f.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(respuesta.body).toMatchObject({
      campanaId: CAMPANA_ID,
      orden: 1,
      url: expect.stringContaining(`/campanas/${CAMPANA_ID}/`),
    });
    expect(storage.subir).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    );
  });

  it('rechaza un archivo que no es imagen (415)', async () => {
    await subir()
      .attach('archivo', Buffer.from('<svg/>'), {
        filename: 'f.png',
        contentType: 'image/png',
      })
      .expect(415);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza una foto mayor a 5 MB (413)', async () => {
    await subir()
      .attach('archivo', Buffer.alloc(TAMANO_MAXIMO_FOTO + 1), {
        filename: 'f.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza cuando no se adjunta archivo (400)', async () => {
    await subir().expect(400);
  });

  it('rechaza una campaña inexistente (404)', async () => {
    campanaExiste = false;
    await subir()
      .attach('archivo', JPG, { filename: 'f.jpg', contentType: 'image/jpeg' })
      .expect(404);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza un identificador que no es UUID (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/campanas/no-uuid/fotos')
      .set('Cookie', COOKIE)
      .set('X-CSRF-Token', CSRF)
      .attach('archivo', JPG, { filename: 'f.jpg', contentType: 'image/jpeg' })
      .expect(400);
  });
});
