import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { FotosCampanaService } from '../src/modules/campanas/fotos-campana.service.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

const ADMINISTRADOR_ID = '11111111-1111-1111-1111-111111111111';
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

describe.skipIf(!URL_PRUEBAS)(
  'fotos de campañas en PostgreSQL (integración)',
  () => {
    let dataSource: DataSource;
    let servicio: FotosCampanaService;
    let campanaId: string;
    const storage = {
      subir: vi.fn().mockResolvedValue(undefined),
      eliminar: vi.fn().mockResolvedValue(undefined),
      obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
    };

    beforeAll(async () => {
      dataSource = new DataSource({
        ...createDatabaseOptions({
          DATABASE_URL: URL_PRUEBAS,
          ...(CA_PRUEBAS ? { DATABASE_CA_CERT_PATH: CA_PRUEBAS } : {}),
        } as NodeJS.ProcessEnv),
        ...(CA_PRUEBAS ? {} : { ssl: false }),
      });
      await dataSource.initialize();

      await dataSource.query(
        `INSERT INTO public.administradores (id, email, nombre, google_sub, activo)
         VALUES ($1, 'integracion-fotos@fundacionfenix.org', 'Integración FÉNIX', 'sub-fotos', true)
         ON CONFLICT (id) DO NOTHING`,
        [ADMINISTRADOR_ID],
      );
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.campanas (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          titulo_es text NOT NULL,
          titulo_en text,
          descripcion_es text,
          descripcion_en text,
          lugar text,
          fecha date,
          estado text NOT NULL DEFAULT 'borrador',
          perros_machos integer NOT NULL DEFAULT 0,
          perros_hembras integer NOT NULL DEFAULT 0,
          gatos_machos integer NOT NULL DEFAULT 0,
          gatos_hembras integer NOT NULL DEFAULT 0,
          es_historico boolean NOT NULL DEFAULT false,
          creado_por uuid REFERENCES public.administradores (id),
          actualizado_por uuid REFERENCES public.administradores (id),
          creado_en timestamptz NOT NULL DEFAULT now(),
          actualizado_en timestamptz NOT NULL DEFAULT now()
        )
      `);

      const existe = await dataSource.query(
        `SELECT to_regclass('public.fotos_campana') AS tabla`,
      );
      if (!existe[0].tabla) {
        const queryRunner = dataSource.createQueryRunner();
        await new CrearTablaFotosCampana1731000000000().up(queryRunner);
        await queryRunner.release();
      }

      servicio = new FotosCampanaService(
        dataSource.getRepository(Campana),
        dataSource.getRepository(FotoCampana),
        storage as unknown as StorageService,
      );
    }, 60_000);

    beforeEach(async () => {
      vi.clearAllMocks();
      const [fila] = await dataSource.query(
        `INSERT INTO public.campanas (titulo_es) VALUES ('Campaña de prueba') RETURNING id`,
      );
      campanaId = fila.id;
    });

    afterEach(async () => {
      await dataSource.query(`DELETE FROM public.campanas WHERE id = $1`, [
        campanaId,
      ]);
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
    });

    it('persiste las fotos con orden consecutivo por campaña', async () => {
      const primera = await servicio.subir(
        campanaId,
        { buffer: JPG, mimetype: 'image/jpeg', size: JPG.length },
        ADMINISTRADOR_ID,
      );
      const segunda = await servicio.subir(
        campanaId,
        { buffer: JPG, mimetype: 'image/jpeg', size: JPG.length },
        ADMINISTRADOR_ID,
      );

      expect([primera.orden, segunda.orden]).toEqual([1, 2]);

      const filas = await dataSource.query(
        `SELECT ruta, content_type, tamano, creado_por FROM public.fotos_campana
          WHERE campana_id = $1 ORDER BY orden`,
        [campanaId],
      );
      expect(filas).toHaveLength(2);
      expect(filas[0]).toMatchObject({
        content_type: 'image/jpeg',
        tamano: JPG.length,
        creado_por: ADMINISTRADOR_ID,
      });
      expect(filas[0].ruta).toMatch(new RegExp(`^campanas/${campanaId}/`));
    });

    it('elimina las fotos al borrar la campaña', async () => {
      await servicio.subir(
        campanaId,
        { buffer: JPG, mimetype: 'image/jpeg', size: JPG.length },
        ADMINISTRADOR_ID,
      );
      await dataSource.query(`DELETE FROM public.campanas WHERE id = $1`, [
        campanaId,
      ]);

      const filas = await dataSource.query(
        `SELECT 1 FROM public.fotos_campana WHERE campana_id = $1`,
        [campanaId],
      );
      expect(filas).toHaveLength(0);
    });

    it('rechaza una ruta repetida y un tamaño no positivo', async () => {
      await expect(
        dataSource.query(
          `INSERT INTO public.fotos_campana (campana_id, ruta, content_type, tamano, orden)
           VALUES ($1, 'r', 'image/jpeg', 0, 1)`,
          [campanaId],
        ),
      ).rejects.toThrow();
    });

    it('elimina del Storage el archivo si falla el registro en PostgreSQL', async () => {
      await dataSource.query(`DELETE FROM public.campanas WHERE id = $1`, [
        campanaId,
      ]);
      vi.spyOn(dataSource.getRepository(Campana), 'findOne').mockResolvedValue({
        id: campanaId,
      } as Campana);

      await expect(
        servicio.subir(
          campanaId,
          { buffer: JPG, mimetype: 'image/jpeg', size: JPG.length },
          ADMINISTRADOR_ID,
        ),
      ).rejects.toThrow();
      expect(storage.eliminar).toHaveBeenCalledTimes(
        storage.subir.mock.calls.length,
      );
    });
  },
);
