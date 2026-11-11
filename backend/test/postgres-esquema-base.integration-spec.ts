import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CrearEsquemaBase1729000000000 } from '../src/database/migrations/1729000000000-CrearEsquemaBase.js';
import { CrearTablaSesionesAdmin1730000000000 } from '../src/database/migrations/1730000000000-CrearTablaSesionesAdmin.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';
import { AgregarBorradoLogicoCampanas1733000000000 } from '../src/database/migrations/1733000000000-AgregarBorradoLogicoCampanas.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

const MIGRACIONES = [
  CrearEsquemaBase1729000000000,
  CrearTablaSesionesAdmin1730000000000,
  CrearTablaFotosCampana1731000000000,
  CrearTablaAnimales1732000000000,
  AgregarBorradoLogicoCampanas1733000000000,
];

const TABLAS = [
  'administradores',
  'auditoria',
  'campanas',
  'campana_fotos',
  'canales_contacto',
  'contenido_institucional',
  'datos_donacion',
  'sesiones_admin',
  'fotos_campana',
  'animales',
];

const VISTAS = [
  'v_campanas_resumen',
  'v_contador_esterilizaciones',
  'v_esterilizaciones_por_mes',
];

function conexion(base: string): DataSource {
  const url = new URL(URL_PRUEBAS as string);
  url.pathname = `/${base}`;
  return new DataSource({
    type: 'postgres',
    url: url.toString(),
    ssl: CA_PRUEBAS ? { rejectUnauthorized: true } : false,
    migrations: MIGRACIONES,
    synchronize: false,
    migrationsRun: false,
  });
}

/**
 * Aplica todas las migraciones sobre una base **vacía** (que crea y borra la
 * propia prueba) y comprueba que el esquema base reproduce la base real.
 */
describe.skipIf(!URL_PRUEBAS)(
  'esquema base y migraciones en una base vacía (integración)',
  () => {
    const nombreBase = `fenix_esquema_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    let administracion: DataSource;
    let base: DataSource;

    beforeAll(async () => {
      administracion = conexion(new URL(URL_PRUEBAS as string).pathname.slice(1));
      await administracion.initialize();
      await administracion.query(`CREATE DATABASE ${nombreBase}`);

      base = conexion(nombreBase);
      await base.initialize();
      await base.runMigrations();
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

    it('crea todas las tablas y vistas que usa la aplicación', async () => {
      for (const objeto of [...TABLAS, ...VISTAS]) {
        const [fila] = await base.query(
          `SELECT to_regclass('public.${objeto}') AS objeto`,
        );
        expect(fila.objeto, objeto).not.toBeNull();
      }
    });

    it('deja RLS activo y sin acceso para los roles públicos', async () => {
      const sinRls = await base.query(
        `SELECT relname FROM pg_class
          WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
            AND relname = ANY($1) AND NOT relrowsecurity`,
        [TABLAS],
      );
      expect(sinRls).toEqual([]);
    });

    it('es idempotente: volver a aplicarla no falla ni cambia nada', async () => {
      const antes = await base.query(
        `SELECT count(*)::int AS n FROM pg_constraint
          WHERE connamespace = 'public'::regnamespace`,
      );
      const queryRunner = base.createQueryRunner();
      await new CrearEsquemaBase1729000000000().up(queryRunner);
      await queryRunner.release();
      const despues = await base.query(
        `SELECT count(*)::int AS n FROM pg_constraint
          WHERE connamespace = 'public'::regnamespace`,
      );
      expect(despues).toEqual(antes);
    });

    describe('reglas que la base impone', () => {
      const adminId = randomUUID();

      beforeAll(async () => {
        await base.query(
          `INSERT INTO public.administradores (id, email, nombre)
           VALUES ($1, 'esquema@fundacionfenix.org', 'Esquema')`,
          [adminId],
        );
      });

      it('no deja cerrar una campaña sin números', async () => {
        await expect(
          base.query(
            `INSERT INTO public.campanas (titulo_es, estado, fecha, lugar)
             VALUES ('Sin cifras', 'cerrada', '2026-01-10', 'La Paz')`,
          ),
        ).rejects.toThrow(/ck_campanas_cerrada_con_numeros/);
      });

      it('exige lugar y fecha para publicar', async () => {
        await expect(
          base.query(
            `INSERT INTO public.campanas (titulo_es, estado)
             VALUES ('Sin lugar', 'publicada')`,
          ),
        ).rejects.toThrow(/ck_campanas_lugar_y_fecha_al_publicar/);
      });

      it('el contador solo suma campañas cerradas y las protege del borrado', async () => {
        await base.query(
          `INSERT INTO public.campanas
             (titulo_es, estado, fecha, lugar, perros_machos, gatos_hembras, creado_por)
           VALUES ('Borrador', 'borrador', NULL, NULL, 50, 50, $1)`,
          [adminId],
        );
        const [cerrada] = await base.query(
          `INSERT INTO public.campanas
             (titulo_es, estado, fecha, lugar, perros_machos, perros_hembras, creado_por)
           VALUES ('Cerrada', 'cerrada', '2026-02-02', 'El Alto', 2, 1, $1)
           RETURNING id`,
          [adminId],
        );

        const [contador] = await base.query(
          `SELECT total, total_perros FROM public.v_contador_esterilizaciones`,
        );
        expect(contador).toEqual({ total: 3, total_perros: 3 });

        await expect(
          base.query(`DELETE FROM public.campanas WHERE id = $1`, [cerrada.id]),
        ).rejects.toThrow(/No se puede borrar una campaña cerrada/);
      });

      it('registra los cambios de las campañas en auditoria', async () => {
        const [{ n }] = await base.query(
          `SELECT count(*)::int AS n FROM public.auditoria
            WHERE tabla = 'campanas' AND accion = 'INSERT'`,
        );
        expect(n).toBeGreaterThanOrEqual(2);
      });
    });
  },
);
