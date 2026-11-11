import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATABASE_ENTITIES } from '../src/database/database-options.js';
import { CrearEsquemaBase1729000000000 } from '../src/database/migrations/1729000000000-CrearEsquemaBase.js';
import { CrearTablaSesionesAdmin1730000000000 } from '../src/database/migrations/1730000000000-CrearTablaSesionesAdmin.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';
import { AgregarBorradoLogicoCampanas1733000000000 } from '../src/database/migrations/1733000000000-AgregarBorradoLogicoCampanas.js';
import { CampanasAdminService } from '../src/modules/campanas/campanas-admin.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { StorageService } from '../src/modules/storage/storage.service.js';
import { ImpactoPublicoService } from '../src/modules/impacto-publico/impacto-publico.service.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

function conexion(base: string, completa: boolean): DataSource {
  const url = new URL(URL_PRUEBAS as string);
  url.pathname = `/${base}`;
  return new DataSource({
    type: 'postgres',
    url: url.toString(),
    ssl: CA_PRUEBAS ? { rejectUnauthorized: true } : false,
    ...(completa
      ? {
          entities: DATABASE_ENTITIES,
          migrations: [
            CrearEsquemaBase1729000000000,
            CrearTablaSesionesAdmin1730000000000,
            CrearTablaFotosCampana1731000000000,
            CrearTablaAnimales1732000000000,
            AgregarBorradoLogicoCampanas1733000000000,
          ],
        }
      : {}),
    synchronize: false,
    migrationsRun: false,
  });
}

/**
 * Cerrar una campaña desde el servicio hace que sus cifras cuenten en el
 * contador público, y las fotos del panel llegan a la API pública.
 */
describe.skipIf(!URL_PRUEBAS)(
  'cerrar campañas y contador público (integración)',
  () => {
    const nombreBase = `fenix_cierre_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const adminId = randomUUID();
    let administracion: DataSource;
    let base: DataSource;
    let admin: CampanasAdminService;
    let publico: ImpactoPublicoService;

    const storage = {
      obtenerUrlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
    } as unknown as StorageService;

    beforeAll(async () => {
      administracion = conexion(
        new URL(URL_PRUEBAS as string).pathname.slice(1),
        false,
      );
      await administracion.initialize();
      await administracion.query(`CREATE DATABASE ${nombreBase}`);

      base = conexion(nombreBase, true);
      await base.initialize();
      await base.runMigrations();
      await base.query(
        `INSERT INTO public.administradores (id, email, nombre)
         VALUES ($1, 'cierre@fundacionfenix.org', 'Cierre')`,
        [adminId],
      );

      admin = new CampanasAdminService(
        base.getRepository(Campana),
        base,
        base.getRepository(FotoCampana),
        storage,
      );
      publico = new ImpactoPublicoService(base, storage);
    }, 60_000);

    afterAll(async () => {
      if (base?.isInitialized) await base.destroy();
      if (administracion?.isInitialized) {
        await administracion.query(
          `DROP DATABASE IF EXISTS ${nombreBase} WITH (FORCE)`,
        );
        await administracion.destroy();
      }
    }, 60_000);

    async function crearPublicada(cifras: Record<string, number>) {
      return admin.crear(
        {
          tituloEs: 'Jornada de prueba',
          lugar: 'Villa Adela, El Alto',
          fecha: '2026-03-14',
          estado: 'publicada',
          ...cifras,
        },
        adminId,
      );
    }

    it('el contador público empieza en cero', async () => {
      const estadisticas = await publico.obtenerEstadisticas();

      expect(estadisticas.caninos.total).toBe(0);
      expect(estadisticas.felinos.total).toBe(0);
    });

    it('una campaña publicada todavía no cuenta en el contador', async () => {
      await crearPublicada({ perrosMachos: 5, perrosHembras: 3, gatosMachos: 2 });

      const estadisticas = await publico.obtenerEstadisticas();

      expect(estadisticas.caninos.total).toBe(0);
    });

    it('al cerrarla, sus cifras suman al contador público', async () => {
      const campana = await crearPublicada({
        perrosMachos: 10,
        perrosHembras: 20,
        gatosMachos: 4,
        gatosHembras: 6,
      });

      const cerrada = await admin.cerrar(campana.id, adminId);
      const estadisticas = await publico.obtenerEstadisticas();

      expect(cerrada.estado).toBe('cerrada');
      expect(estadisticas.caninos).toEqual({ total: 30, machos: 10, hembras: 20 });
      expect(estadisticas.felinos).toEqual({ total: 10, machos: 4, hembras: 6 });
    });

    it('no se puede editar una campaña cerrada, pero sí tras reabrirla', async () => {
      const campana = await crearPublicada({ perrosMachos: 1 });
      await admin.cerrar(campana.id, adminId);

      await expect(
        admin.actualizar(
          campana.id,
          { tituloEs: 'Nuevo', estado: 'publicada', lugar: 'X', fecha: '2026-03-14' },
          adminId,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      const antes = await publico.obtenerEstadisticas();
      await admin.reabrir(campana.id, adminId);
      const despues = await publico.obtenerEstadisticas();

      expect(despues.caninos.total).toBe(antes.caninos.total - 1);
      await expect(
        admin.actualizar(
          campana.id,
          { tituloEs: 'Nuevo', estado: 'publicada', lugar: 'X', fecha: '2026-03-14' },
          adminId,
        ),
      ).resolves.toMatchObject({ tituloEs: 'Nuevo', estado: 'publicada' });
    });

    it('no cierra una campaña sin esterilizaciones', async () => {
      const campana = await crearPublicada({});

      await expect(admin.cerrar(campana.id, adminId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('las fotos subidas desde el panel salen en la API pública', async () => {
      const campana = await crearPublicada({ gatosMachos: 2 });
      await base.query(
        `INSERT INTO public.fotos_campana (campana_id, ruta, content_type, tamano, orden, creado_por)
         VALUES ($1, 'campanas/prueba/1.webp', 'image/webp', 1234, 1, $2)`,
        [campana.id, adminId],
      );

      const publica = await publico.listarCampanas(2026);
      const encontrada = publica.find((item) => item.id === campana.id);

      expect(encontrada?.fotos).toEqual(['https://cdn.test/campanas/prueba/1.webp']);
    });
  },
);
