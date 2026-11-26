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
import { fechaDeArchivo } from '../src/common/utils/archivo-exportacion.js';
import { configureApplication } from '../src/config/configure-application.js';
import { AutorizacionAdministradorService } from '../src/modules/administradores/services/autorizacion-administrador.service.js';
import { Animal } from '../src/modules/animales/entities/animal.entity.js';
import { CookieSesionService } from '../src/modules/auth/services/cookie-sesion.service.js';
import { SesionAdminService } from '../src/modules/auth/services/sesion-admin.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { StorageService } from '../src/modules/storage/storage.service.js';
import { fuentesDelPdf, leerPaginasPdf } from './utils/leer-pdf.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const COOKIE = 'fenix_session=sesion-valida';
const CAMPANAS = '/api/admin/campanas/exportar';
const ANIMALES = '/api/admin/animales/exportar';
const BOM = '﻿';

function crearCampana(cambios: Partial<Campana> = {}): Campana {
  return Object.assign(new Campana(), {
    id: randomUUID(),
    tituloEs: 'Campaña existente',
    tituloEn: null,
    descripcionEs: null,
    descripcionEn: null,
    lugar: null,
    fecha: null,
    estado: 'publicada',
    perrosMachos: 0,
    perrosHembras: 0,
    gatosMachos: 0,
    gatosHembras: 0,
    esHistorico: false,
    eliminadoEn: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  });
}

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
    fotoEntregaRuta: null,
    eliminadoEn: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  });
}

/** Descarga el cuerpo binario para conservar el BOM sin que se descarte. */
const comoTexto = (
  respuesta: request.Response,
  callback: (error: Error | null, cuerpo: string) => void,
) => {
  const trozos: Buffer[] = [];
  respuesta.on('data', (trozo: Buffer) => trozos.push(trozo));
  respuesta.on('end', () =>
    callback(null, Buffer.concat(trozos).toString('utf8')),
  );
};

const comoBinario = (
  respuesta: request.Response,
  callback: (error: Error | null, cuerpo: Buffer) => void,
) => {
  const trozos: Buffer[] = [];
  respuesta.on('data', (trozo: Buffer) => trozos.push(trozo));
  respuesta.on('end', () => callback(null, Buffer.concat(trozos)));
};

describe('exportación del panel (e2e)', () => {
  let app: INestApplication<App>;
  let campanas: Campana[];
  let animales: Animal[];
  let qb: Record<string, ReturnType<typeof vi.fn>>;
  let administradorActivo: boolean;

  const crearQb = () => {
    qb = {};
    for (const metodo of [
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
    ]) {
      qb[metodo] = vi.fn(() => qb);
    }
    qb.getMany = vi.fn(async () => [...campanas]);
    return qb;
  };

  const repositorioCampanas = {
    createQueryBuilder: vi.fn(() => crearQb()),
  };
  const repositorioAnimales = {
    find: vi.fn(async (_opciones?: unknown) => [...animales]),
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
        query: vi.fn().mockResolvedValue([]),
      })
      .overrideProvider(getRepositoryToken(Campana))
      .useValue(repositorioCampanas)
      .overrideProvider(getRepositoryToken(Animal))
      .useValue(repositorioAnimales)
      .overrideProvider(getRepositoryToken(FotoCampana))
      .useValue({ find: vi.fn(async () => []) })
      .overrideProvider(StorageService)
      .useValue({ obtenerUrlPublica: vi.fn(), eliminar: vi.fn() })
      .overrideProvider(SesionAdminService)
      .useValue({
        validar: vi.fn(async () => ({
          requiereRotacion: false,
          contexto: {
            id: 'sesion-id',
            administradorId: ADMIN_ID,
            csrfToken: 'csrf-valido',
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
    campanas = [];
    animales = [];
    administradorActivo = true;
    vi.clearAllMocks();
  });

  const servidor = () => request(app.getHttpServer());
  const descargar = (url: string) =>
    servidor().get(url).set('Cookie', COOKIE).buffer(true).parse(comoTexto);

  const descargarPdf = (url: string) =>
    servidor().get(url).set('Cookie', COOKIE).buffer(true).parse(comoBinario);

  describe.each([
    ['campañas', CAMPANAS],
    ['animales', ANIMALES],
  ])('autorización y validación de %s', (_modulo, url) => {
    it.each(['csv', 'pdf'])(
      'rechaza una petición anónima de %s (401)',
      async (formato) => {
        await servidor().get(`${url}?formato=${formato}`).expect(401);
      },
    );

    it('rechaza un administrador desactivado (403)', async () => {
      administradorActivo = false;
      await servidor()
        .get(`${url}?formato=csv`)
        .set('Cookie', COOKIE)
        .expect(403);
    });

    it('rechaza un formato ausente o desconocido (400)', async () => {
      await servidor().get(url).set('Cookie', COOKIE).expect(400);
      await servidor()
        .get(`${url}?formato=xlsx`)
        .set('Cookie', COOKIE)
        .expect(400);
    });
  });

  describe('campañas', () => {
    it('devuelve un CSV UTF-8 con BOM, separador ; y nombre con módulo y fecha', async () => {
      campanas = [
        crearCampana({
          tituloEs: 'Campaña Ñandú',
          lugar: 'Villa Adela, El Alto',
          fecha: '2026-11-21',
          perrosMachos: 2,
          perrosHembras: 3,
          gatosMachos: 1,
          gatosHembras: 4,
        }),
      ];

      const respuesta = await descargar(`${CAMPANAS}?formato=csv`).expect(200);

      expect(respuesta.headers['content-type']).toContain('text/csv');
      expect(respuesta.headers['content-type']).toContain('utf-8');
      expect(respuesta.headers['content-disposition']).toBe(
        `attachment; filename="campanas_${fechaDeArchivo()}.csv"`,
      );
      expect(respuesta.headers['cache-control']).toBe('no-store');
      const csv = respuesta.body as string;
      expect(csv.startsWith(BOM)).toBe(true);
      const [encabezado, fila] = csv.slice(1).split('\r\n');
      expect(encabezado).toBe(
        'Título;Título (inglés);Lugar;Fecha;Estado;Perros machos;Perros hembras;Gatos machos;Gatos hembras;Total;Histórica',
      );
      expect(fila).toBe(
        'Campaña Ñandú;;Villa Adela, El Alto;2026-11-21;Publicada;2;3;1;4;10;No',
      );
    });

    it('neutraliza las celdas que empiezan con = + - @', async () => {
      campanas = ['=1+1', '+1', '-1', '@SUMA(A1)'].map((tituloEs) =>
        crearCampana({ tituloEs }),
      );

      const csv = (await descargar(`${CAMPANAS}?formato=csv`).expect(200))
        .body as string;
      const titulos = csv
        .slice(1)
        .split('\r\n')
        .slice(1, 5)
        .map((fila) => fila.split(';')[0]);
      expect(titulos).toEqual(["'=1+1", "'+1", "'-1", "'@SUMA(A1)"]);
    });

    it('exporta todos los registros del filtro, sin paginar', async () => {
      campanas = Array.from({ length: 75 }, (_, i) =>
        crearCampana({ tituloEs: `Campaña ${i + 1}` }),
      );

      const csv = (
        await descargar(
          `${CAMPANAS}?formato=csv&anio=2026&mes=11&pagina=2&limite=10`,
        ).expect(200)
      ).body as string;

      const filas = csv.trim().split('\r\n');
      expect(filas).toHaveLength(76); // encabezado + 75 campañas
      expect(qb.offset).not.toHaveBeenCalled();
      expect(qb.limit).not.toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'EXTRACT(YEAR FROM c.fecha) = :anio',
        { anio: 2026 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'EXTRACT(MONTH FROM c.fecha) = :mes',
        { mes: 11 },
      );
    });

    it('rechaza un mes inválido (400)', async () => {
      await servidor()
        .get(`${CAMPANAS}?formato=csv&mes=13`)
        .set('Cookie', COOKIE)
        .expect(400);
    });
  });

  describe('animales', () => {
    it('devuelve un CSV con acentos y el nombre animales_fecha.csv', async () => {
      animales = [
        crearAnimal({
          nombre: 'Peña',
          adoptado: true,
          nombreAdoptante: 'José; "Pepe" Núñez',
          direccionAdoptante: 'Calle 5',
          fechaAdopcion: '2026-02-01',
        }),
      ];

      const respuesta = await descargar(`${ANIMALES}?formato=csv`).expect(200);

      expect(respuesta.headers['content-disposition']).toBe(
        `attachment; filename="animales_${fechaDeArchivo()}.csv"`,
      );
      const csv = respuesta.body as string;
      expect(csv.startsWith(BOM)).toBe(true);
      const [encabezado, fila] = csv.slice(1).split('\r\n');
      expect(encabezado.split(';')).toHaveLength(10);
      expect(fila).toBe(
        'Peña;perro;macho;3;anios;2025-03-12;Sí;"José; ""Pepe"" Núñez";Calle 5;2026-02-01',
      );
    });

    it('neutraliza fórmulas y aplica el filtro adoptado sin paginar', async () => {
      animales = [crearAnimal({ nombre: '=cmd|calc' })];

      const csv = (
        await descargar(
          `${ANIMALES}?formato=csv&adoptado=false&limite=1`,
        ).expect(200)
      ).body as string;

      expect(csv).toContain("'=cmd|calc;");
      const opciones = repositorioAnimales.find.mock.calls[0]?.[0] as {
        where: { adoptado?: boolean };
        skip?: number;
        take?: number;
      };
      expect(opciones.where.adoptado).toBe(false);
      expect(opciones.skip).toBeUndefined();
      expect(opciones.take).toBeUndefined();
    });
  });

  describe('PDF', () => {
    it('devuelve las campañas con encabezado, filtros, acentos y fuente incrustada', async () => {
      campanas = [
        crearCampana({
          tituloEs: 'Esterilización Señor de Mayo',
          lugar: 'Ñuñumayani',
          fecha: '2026-11-21',
          perrosMachos: 2,
          perrosHembras: 3,
        }),
      ];

      const respuesta = await descargarPdf(
        `${CAMPANAS}?formato=pdf&anio=2026&mes=11&q=se%C3%B1or`,
      ).expect(200);

      expect(respuesta.headers['content-type']).toBe('application/pdf');
      expect(respuesta.headers['content-disposition']).toBe(
        `attachment; filename="campanas_${fechaDeArchivo()}.pdf"`,
      );
      expect(respuesta.headers['cache-control']).toBe('no-store');
      const contenido = respuesta.body as Buffer;
      expect(fuentesDelPdf(contenido).incrustadas).toBe(2);
      const [pagina] = await leerPaginasPdf(contenido);
      expect(pagina).toContain('Fénix LPB');
      expect(pagina).toContain('Campañas de esterilización');
      expect(pagina).toContain('Generado el');
      expect(pagina).toContain(
        'Filtros aplicados: Año: 2026 · Mes: noviembre · Búsqueda: «señor»',
      );
      expect(pagina).toContain('Esterilización Señor de Mayo');
      expect(pagina).toContain('Ñuñumayani');
      expect(pagina).toContain('21/11/2026');
      expect(pagina).toContain('2 / 3');
    });

    it('incluye todos los animales del filtro en varias páginas', async () => {
      animales = Array.from({ length: 75 }, (_, i) =>
        crearAnimal({ nombre: `Peña ${i + 1}.` }),
      );

      const respuesta = await descargarPdf(
        `${ANIMALES}?formato=pdf&adoptado=false&pagina=2&limite=10`,
      ).expect(200);

      expect(respuesta.headers['content-disposition']).toBe(
        `attachment; filename="animales_${fechaDeArchivo()}.pdf"`,
      );
      const paginas = await leerPaginasPdf(respuesta.body as Buffer);
      expect(paginas.length).toBeGreaterThan(1);
      expect(paginas[0]).toContain(
        'Filtros aplicados: Estado: En la fundación',
      );
      expect(paginas[0]).toContain('Registros: 75');
      const texto = paginas.join(' ');
      for (const { nombre } of animales) expect(texto).toContain(nombre);
    });
  });
});
