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
import { Animal } from '../src/modules/animales/entities/animal.entity.js';
import { Auditoria } from '../src/modules/auditoria/entities/auditoria.entity.js';
import { CookieSesionService } from '../src/modules/auth/services/cookie-sesion.service.js';
import { SesionAdminService } from '../src/modules/auth/services/sesion-admin.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const COOKIE = 'fenix_session=sesion-valida';
const CSRF = 'csrf-valido';
const ANIMALES = '/api/admin/animales';
const CAMPANAS = '/api/admin/campanas';
const RESUMEN = '/api/admin/resumen';

function crearAnimal(cambios: Partial<Animal> = {}): Animal {
  return Object.assign(new Animal(), {
    id: randomUUID(),
    nombre: 'Max',
    especie: 'perro',
    sexo: 'macho',
    edad: 3,
    edadUnidad: 'anios',
    fechaIngreso: '2025-03-12',
    adoptado: false,
    nombreAdoptante: null,
    direccionAdoptante: null,
    fechaAdopcion: null,
    fotoAnimalRuta: null,
    fotoAnimalContentType: null,
    fotoAnimalTamano: null,
    fotoEntregaRuta: null,
    fotoEntregaContentType: null,
    fotoEntregaTamano: null,
    creadoPorId: null,
    actualizadoPorId: null,
    eliminadoPorId: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    eliminadoEn: null,
    ...cambios,
  });
}

const datosAnimal = {
  nombre: 'Max el grande',
  especie: 'perro',
  sexo: 'macho',
  edad: 4,
  edadUnidad: 'anios',
  fechaIngreso: '2025-03-12',
  adoptado: false,
};

describe('animales, fotos de campaña y resumen del panel (e2e)', () => {
  let app: INestApplication<App>;
  let animales: Animal[];
  let auditorias: Array<Partial<Auditoria>>;
  let campana: { id: string; estado: string } | null;
  let fotos: Array<{ id: string; campanaId: string; ruta: string; orden: number }>;
  let resumenFalla: boolean;

  const storage = {
    subir: vi.fn(),
    eliminar: vi.fn(async () => undefined),
    obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
    crearUrlFirmada: vi.fn(),
  };

  const buscarAnimal = async ({ where }: { where: { id: string } }) =>
    animales.find((animal) => animal.id === where.id && !animal.eliminadoEn) ??
    null;

  const repositorioAnimales = {
    find: vi.fn(async () => animales),
    findOne: vi.fn(buscarAnimal),
    update: vi.fn(
      async (id: string, cambios: Partial<Animal>): Promise<void> => {
        const animal = animales.find((actual) => actual.id === id);
        if (animal) Object.assign(animal, cambios);
      },
    ),
  };

  const repositorioAnimalesTransaccion = {
    findOne: vi.fn(buscarAnimal),
    save: vi.fn(async (animal: Animal) => animal),
  };

  const repositorioAuditoria = {
    create: vi.fn((datos: Partial<Auditoria>) => ({ id: randomUUID(), ...datos })),
    save: vi.fn(async (auditoria: Partial<Auditoria>) => {
      auditorias.push(auditoria);
      return auditoria;
    }),
  };

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === Animal ? repositorioAnimalesTransaccion : repositorioAuditoria,
    ),
  };

  const repositorioFotos = {
    find: vi.fn(async () => [...fotos].sort((a, b) => a.orden - b.orden)),
    findOne: vi.fn(
      async ({ where }: { where: { id: string; campanaId: string } }) =>
        fotos.find(
          (foto) => foto.id === where.id && foto.campanaId === where.campanaId,
        ) ?? null,
    ),
    delete: vi.fn(async ({ id }: { id: string }) => {
      fotos = fotos.filter((foto) => foto.id !== id);
    }),
    save: vi.fn(async (lista: typeof fotos) => lista),
  };

  const dataSource = {
    destroy: vi.fn().mockResolvedValue(undefined),
    entityMetadatas: [],
    getRepository: vi.fn().mockReturnValue({}),
    isInitialized: true,
    options: { type: 'postgres' },
    query: vi.fn(async () => {
      if (resumenFalla) throw new Error('host secreto');
      return [];
    }),
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
      .overrideProvider(getRepositoryToken(Animal))
      .useValue(repositorioAnimales)
      .overrideProvider(getRepositoryToken(Campana))
      .useValue({
        find: vi.fn(async () => []),
        findOne: vi.fn(async () => campana),
      })
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
    animales = [];
    auditorias = [];
    fotos = [];
    campana = { id: randomUUID(), estado: 'publicada' };
    resumenFalla = false;
    vi.clearAllMocks();
  });

  const servidor = () => request(app.getHttpServer());
  const conSesion = (peticion: request.Test) =>
    peticion.set('Cookie', COOKIE).set('X-CSRF-Token', CSRF);

  describe('editar un animal', () => {
    it('rechaza sin sesión (401) y sin token CSRF (403)', async () => {
      const animal = crearAnimal();
      animales = [animal];

      await servidor().put(`${ANIMALES}/${animal.id}`).send(datosAnimal).expect(401);
      await servidor()
        .put(`${ANIMALES}/${animal.id}`)
        .set('Cookie', COOKIE)
        .send(datosAnimal)
        .expect(403);
      expect(animales[0].nombre).toBe('Max');
    });

    it('actualiza el animal y lo audita', async () => {
      const animal = crearAnimal();
      animales = [animal];

      const respuesta = await conSesion(
        servidor().put(`${ANIMALES}/${animal.id}`),
      )
        .send(datosAnimal)
        .expect(200);

      expect(respuesta.body).toMatchObject({
        id: animal.id,
        nombre: 'Max el grande',
        edad: 4,
        adoptado: false,
      });
      expect(auditorias[0]).toMatchObject({ tabla: 'animales', accion: 'UPDATE' });
    });

    it('responde 404 si no existe', async () => {
      await conSesion(servidor().put(`${ANIMALES}/${randomUUID()}`))
        .send(datosAnimal)
        .expect(404);
    });

    it('responde 400 con datos inválidos o un id que no es UUID', async () => {
      const animal = crearAnimal();
      animales = [animal];

      await conSesion(servidor().put(`${ANIMALES}/${animal.id}`))
        .send({ ...datosAnimal, nombre: '   ' })
        .expect(400);
      await conSesion(servidor().put(`${ANIMALES}/no-es-uuid`))
        .send(datosAnimal)
        .expect(400);
    });
  });

  describe('eliminar un animal', () => {
    it('rechaza sin sesión (401) y sin token CSRF (403)', async () => {
      const animal = crearAnimal();
      animales = [animal];

      await servidor().delete(`${ANIMALES}/${animal.id}`).expect(401);
      await servidor()
        .delete(`${ANIMALES}/${animal.id}`)
        .set('Cookie', COOKIE)
        .expect(403);
      expect(animales[0].eliminadoEn).toBeNull();
    });

    it('lo elimina de forma lógica, responde 204 y lo audita', async () => {
      const animal = crearAnimal();
      animales = [animal];

      await conSesion(servidor().delete(`${ANIMALES}/${animal.id}`)).expect(204);

      expect(animales[0].eliminadoEn).toBeInstanceOf(Date);
      expect(auditorias[0]).toMatchObject({ accion: 'DELETE', registroId: animal.id });
    });

    it('responde 404 si ya estaba eliminado', async () => {
      const animal = crearAnimal({ eliminadoEn: new Date() });
      animales = [animal];

      await conSesion(servidor().delete(`${ANIMALES}/${animal.id}`)).expect(404);
    });
  });

  describe('quitar la foto de un animal', () => {
    it('rechaza sin token CSRF (403)', async () => {
      const animal = crearAnimal({ fotoAnimalRuta: 'animales/a.jpg' });
      animales = [animal];

      await servidor()
        .delete(`${ANIMALES}/${animal.id}/fotos/animal`)
        .set('Cookie', COOKIE)
        .expect(403);
      expect(animales[0].fotoAnimalRuta).toBe('animales/a.jpg');
    });

    it('quita la foto, responde 204 y la borra del bucket privado', async () => {
      const animal = crearAnimal({
        fotoAnimalRuta: 'animales/a.jpg',
        fotoAnimalContentType: 'image/jpeg',
        fotoAnimalTamano: 10,
      });
      animales = [animal];

      await conSesion(
        servidor().delete(`${ANIMALES}/${animal.id}/fotos/animal`),
      ).expect(204);

      expect(animales[0].fotoAnimalRuta).toBeNull();
      expect(storage.eliminar).toHaveBeenCalledWith('animales/a.jpg', true);
    });

    it('responde 404 si no tiene esa foto y 400 si el tipo no existe', async () => {
      const animal = crearAnimal();
      animales = [animal];

      await conSesion(
        servidor().delete(`${ANIMALES}/${animal.id}/fotos/animal`),
      ).expect(404);
      await conSesion(
        servidor().delete(`${ANIMALES}/${animal.id}/fotos/otra`),
      ).expect(400);
    });
  });

  describe('fotos de campaña: quitar y reordenar', () => {
    const FOTO_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const FOTO_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    beforeEach(() => {
      fotos = [
        { id: FOTO_A, campanaId: campana!.id, ruta: 'campanas/a.webp', orden: 1 },
        { id: FOTO_B, campanaId: campana!.id, ruta: 'campanas/b.webp', orden: 2 },
      ];
    });

    it('rechaza quitar y reordenar sin token CSRF (403)', async () => {
      await servidor()
        .delete(`${CAMPANAS}/${campana!.id}/fotos/${FOTO_A}`)
        .set('Cookie', COOKIE)
        .expect(403);
      await servidor()
        .put(`${CAMPANAS}/${campana!.id}/fotos/orden`)
        .set('Cookie', COOKIE)
        .send({ ids: [FOTO_B, FOTO_A] })
        .expect(403);
      expect(fotos).toHaveLength(2);
    });

    it('quita una foto y responde 204', async () => {
      await conSesion(
        servidor().delete(`${CAMPANAS}/${campana!.id}/fotos/${FOTO_A}`),
      ).expect(204);

      expect(fotos.map((foto) => foto.id)).toEqual([FOTO_B]);
      expect(storage.eliminar).toHaveBeenCalledWith('campanas/a.webp');
    });

    it('responde 404 si la foto no existe y 409 si la campaña está cerrada', async () => {
      await conSesion(
        servidor().delete(`${CAMPANAS}/${campana!.id}/fotos/${randomUUID()}`),
      ).expect(404);

      campana = { ...campana!, estado: 'cerrada' };
      await conSesion(
        servidor().delete(`${CAMPANAS}/${campana.id}/fotos/${FOTO_A}`),
      ).expect(409);
      expect(fotos).toHaveLength(2);
    });

    it('reordena la galería y devuelve las fotos en el nuevo orden', async () => {
      const respuesta = await conSesion(
        servidor().put(`${CAMPANAS}/${campana!.id}/fotos/orden`),
      )
        .send({ ids: [FOTO_B, FOTO_A] })
        .expect(200);

      expect(
        respuesta.body.map((foto: { id: string; orden: number }) => [foto.id, foto.orden]),
      ).toEqual([
        [FOTO_B, 1],
        [FOTO_A, 2],
      ]);
      expect(respuesta.body[0].url).toBe('https://cdn.test/campanas/b.webp');
    });

    it.each([
      ['faltan fotos', { ids: [FOTO_A] }],
      ['hay repetidas', { ids: [FOTO_A, FOTO_A] }],
      ['no son UUID', { ids: ['uno', 'dos'] }],
      ['la lista está vacía', { ids: [] }],
      ['no se envía ids', {}],
    ])('responde 400 si %s', async (_caso, cuerpo) => {
      await conSesion(servidor().put(`${CAMPANAS}/${campana!.id}/fotos/orden`))
        .send(cuerpo)
        .expect(400);
      expect(repositorioFotos.save).not.toHaveBeenCalled();
    });
  });

  describe('resumen del panel', () => {
    it('rechaza sin sesión (401)', async () => {
      await servidor().get(RESUMEN).expect(401);
    });

    it('responde 200 con la forma que usa el panel', async () => {
      const respuesta = await servidor().get(RESUMEN).set('Cookie', COOKIE).expect(200);

      expect(Object.keys(respuesta.body).sort()).toEqual(
        [
          'adopcionesDelAnio',
          'diasHastaAdoptar',
          'enLaFundacion',
          'esterilizaciones',
          'espera',
          'serie',
        ].sort(),
      );
      expect(respuesta.headers['cache-control']).toBe('no-store');
    });

    it('responde 503 sin filtrar detalles si PostgreSQL falla', async () => {
      resumenFalla = true;

      const respuesta = await servidor().get(RESUMEN).set('Cookie', COOKIE).expect(503);

      expect(JSON.stringify(respuesta.body)).not.toContain('host secreto');
    });
  });
});
