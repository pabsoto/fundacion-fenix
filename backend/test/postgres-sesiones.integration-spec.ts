import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { SesionAdmin } from '../src/modules/auth/entities/sesion-admin.entity.js';
import {
  SesionAdminService,
  SesionDesconocidaError,
  SesionExpiradaError,
  SesionRevocadaError,
} from '../src/modules/auth/services/sesion-admin.service.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

const ADMINISTRADOR_ID = '11111111-1111-1111-1111-111111111111';

const CONFIGURACION = {
  AUTH_REDIRECT_URL: 'http://localhost:5173/admin',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  NODE_ENV: 'test',
  SESSION_COOKIE_NAME: 'fenix_session',
  SESSION_COOKIE_PATH: '/api',
  SESSION_COOKIE_SAMESITE: 'lax',
  SESSION_COOKIE_SECURE: 'false',
  SESSION_IDLE_TIMEOUT_SECONDS: '1800',
  SESSION_ABSOLUTE_TIMEOUT_SECONDS: '43200',
  SESSION_ROTATION_INTERVAL_SECONDS: '300',
};

/**
 * Pruebas de integración contra una instancia PostgreSQL **aislada**.
 *
 * No se ejecutan contra Supabase ni contra ninguna base de datos de
 * producción: la instancia se levanta en un contenedor local y se destruye al
 * terminar. Si no se define `TEST_DATABASE_URL`, la suite se omite.
 *
 * Esta suite comprueba el comportamiento que los dobles de prueba no pueden
 * garantizar: restricciones reales, índices, cascadas y persistencia entre
 * reinicios del backend.
 */
describe.skipIf(!URL_PRUEBAS)(
  'almacén de sesiones en PostgreSQL (integración)',
  () => {
    let dataSource: DataSource;
    let repositorio: Repository<SesionAdmin>;
    let servicio: SesionAdminService;

    beforeAll(async () => {
      dataSource = new DataSource(
        createDatabaseOptions({
          DATABASE_URL: URL_PRUEBAS,
          ...(CA_PRUEBAS ? { DATABASE_CA_CERT_PATH: CA_PRUEBAS } : {}),
        } as NodeJS.ProcessEnv),
      );

      await dataSource.initialize();
      repositorio = dataSource.getRepository(SesionAdmin);

      const config = {
        get: (clave: string) => CONFIGURACION[clave],
      } as unknown as ConfigService;

      servicio = new SesionAdminService(repositorio, config);

      await dataSource.query(
        `INSERT INTO public.administradores (id, email, nombre, google_sub, activo)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO NOTHING`,
        [
          ADMINISTRADOR_ID,
          'integracion@fundacionfenix.org',
          'Integración FÉNIX',
          'sub-integracion',
        ],
      );
    }, 60_000);

    afterEach(async () => {
      await repositorio.clear();
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
    });

    it('persiste la sesión y sólo almacena el resumen del identificador', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      const fila = await repositorio.findOne({
        where: { administradorId: ADMINISTRADOR_ID },
      });

      expect(fila).not.toBeNull();
      expect(fila?.tokenHash).toBe(
        createHash('sha256').update(emitida.token, 'utf8').digest('hex'),
      );
      expect(JSON.stringify(fila)).not.toContain(emitida.token);
      expect(fila?.revocadaEn).toBeNull();
      expect(fila?.motivoRevocacion).toBeNull();
    });

    it('rechaza un identificador alterado', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      await expect(
        servicio.validar(`${emitida.token}alterado`),
      ).rejects.toBeInstanceOf(SesionDesconocidaError);
    });

    it('rechaza una sesión caducada por inactividad', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      await repositorio.update(
        { administradorId: ADMINISTRADOR_ID },
        { ultimaActividadEn: new Date(Date.now() - 3_600_000) },
      );

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionExpiradaError,
      );
    });

    it('rechaza una sesión que superó el tiempo máximo absoluto', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      // La caducidad absoluta siempre es posterior a la creación: se
      // desplazan ambas marcas de tiempo.
      await repositorio.update(
        { administradorId: ADMINISTRADOR_ID },
        {
          creadaEn: new Date(Date.now() - 7_200_000),
          expiraEn: new Date(Date.now() - 3_600_000),
        },
      );

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionExpiradaError,
      );
    });

    it('rechaza una sesión revocada', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      await servicio.revocar(emitida.contexto, 'logout');

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionRevocadaError,
      );
    });

    it('invalida el identificador anterior al renovarlo', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const validacion = await servicio.validar(emitida.token);

      const nuevo = await servicio.rotar(validacion.contexto);

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionDesconocidaError,
      );
      await expect(servicio.validar(nuevo)).resolves.toBeDefined();
    });

    it('mantiene la sesión tras un reinicio del backend', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      // Nueva instancia del servicio: simula el reinicio del proceso.
      const servicioTrasReinicio = new SesionAdminService(
        dataSource.getRepository(SesionAdmin),
        {
          get: (clave: string) => CONFIGURACION[clave],
        } as unknown as ConfigService,
      );

      const validacion = await servicioTrasReinicio.validar(emitida.token);

      expect(validacion.contexto.administradorId).toBe(ADMINISTRADOR_ID);
    });

    it('aplica la restricción de unicidad del resumen del identificador', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const fila = await repositorio.findOne({
        where: { administradorId: ADMINISTRADOR_ID },
      });

      await expect(
        repositorio.insert({
          administradorId: ADMINISTRADOR_ID,
          tokenHash: fila?.tokenHash ?? '',
          csrfToken: 'otro-csrf',
          creadaEn: new Date(),
          tokenEmitidoEn: new Date(),
          ultimaActividadEn: new Date(),
          expiraEn: new Date(Date.now() + 60_000),
          revocadaEn: null,
          motivoRevocacion: null,
        }),
      ).rejects.toThrow();

      expect(emitida.token).toBeTruthy();
    });

    it('exige que la revocación y su motivo sean coherentes', async () => {
      await expect(
        repositorio.insert({
          administradorId: ADMINISTRADOR_ID,
          tokenHash: 'hash-de-prueba-unico',
          csrfToken: 'csrf',
          creadaEn: new Date(),
          tokenEmitidoEn: new Date(),
          ultimaActividadEn: new Date(),
          expiraEn: new Date(Date.now() + 60_000),
          revocadaEn: new Date(),
          motivoRevocacion: null,
        }),
      ).rejects.toThrow();
    });

    it('exige que la caducidad sea posterior a la creación', async () => {
      await expect(
        repositorio.insert({
          administradorId: ADMINISTRADOR_ID,
          tokenHash: 'hash-de-prueba-unico-2',
          csrfToken: 'csrf',
          creadaEn: new Date(),
          tokenEmitidoEn: new Date(),
          ultimaActividadEn: new Date(),
          expiraEn: new Date(Date.now() - 60_000),
          revocadaEn: null,
          motivoRevocacion: null,
        }),
      ).rejects.toThrow();
    });

    it('elimina las sesiones del administrador cuando se borra la cuenta', async () => {
      await servicio.crear(ADMINISTRADOR_ID);

      const temporal = '44444444-4444-4444-4444-444444444444';
      await dataSource.query(
        `INSERT INTO public.administradores (id, email, nombre, google_sub, activo)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO NOTHING`,
        [temporal, 'temporal@fundacionfenix.org', 'Temporal', 'sub-temporal'],
      );

      await servicio.crear(temporal);
      expect(await repositorio.count()).toBe(2);

      await dataSource.query(
        'DELETE FROM public.administradores WHERE id = $1',
        [temporal],
      );

      expect(await repositorio.count()).toBe(1);
    });

    it('no escribe el identificador de sesión en los registros del servidor', async () => {
      const registrar = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      await servicio.validar(emitida.token);

      expect(registrar).not.toHaveBeenCalled();
      registrar.mockRestore();
    });

    describe('protecciones de la tabla', () => {
      it('tiene Row Level Security activado y ninguna política', async () => {
        const [estado] = await dataSource.query(
          `SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS forzado,
                  (SELECT count(*)::int FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'sesiones_admin') AS politicas
             FROM pg_class c
            WHERE c.oid = 'public.sesiones_admin'::regclass`,
        );

        expect(estado.rls).toBe(true);
        expect(estado.forzado).toBe(false);
        expect(estado.politicas).toBe(0);
      });

      it('no concede ningún privilegio a PUBLIC', async () => {
        const [resultado] = await dataSource.query(`
          SELECT EXISTS (
            SELECT 1
              FROM pg_class c,
                   aclexplode(c.relacl) AS permiso
             WHERE c.oid = 'public.sesiones_admin'::regclass
               AND permiso.grantee = 0
               AND permiso.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
          ) AS public_tiene_privilegios
        `);

        expect(resultado.public_tiene_privilegios).toBe(false);
      });

      it('no concede ningún privilegio a anon ni a authenticated', async () => {
        const roles = await dataSource.query(
          `SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')`,
        );

        for (const rol of roles) {
          const [permisos] = await dataSource.query(
            `SELECT has_table_privilege($1, 'public.sesiones_admin', 'SELECT') AS puede_leer,
                    has_table_privilege($1, 'public.sesiones_admin', 'INSERT') AS puede_insertar,
                    has_table_privilege($1, 'public.sesiones_admin', 'UPDATE') AS puede_actualizar,
                    has_table_privilege($1, 'public.sesiones_admin', 'DELETE') AS puede_borrar`,
            [rol.rolname],
          );

          expect(permisos.puede_leer).toBe(false);
          expect(permisos.puede_insertar).toBe(false);
          expect(permisos.puede_actualizar).toBe(false);
          expect(permisos.puede_borrar).toBe(false);
        }
      });

      it('el rol del backend conserva acceso completo a la tabla', async () => {
        const [permisos] = await dataSource.query(
          `SELECT has_table_privilege(current_user, 'public.sesiones_admin', 'SELECT') AS puede_leer,
                  has_table_privilege(current_user, 'public.sesiones_admin', 'INSERT') AS puede_insertar,
                  has_table_privilege(current_user, 'public.sesiones_admin', 'UPDATE') AS puede_actualizar,
                  has_table_privilege(current_user, 'public.sesiones_admin', 'DELETE') AS puede_borrar`,
        );

        expect(permisos.puede_leer).toBe(true);
        expect(permisos.puede_insertar).toBe(true);
        expect(permisos.puede_actualizar).toBe(true);
        expect(permisos.puede_borrar).toBe(true);
      });

      it('declara la clave foránea con borrado en cascada hacia administradores', async () => {
        const [restricciones] = await dataSource.query(
          `SELECT conname, pg_get_constraintdef(oid) AS definicion
             FROM pg_constraint
            WHERE conrelid = 'public.sesiones_admin'::regclass AND contype = 'f'`,
        );

        expect(restricciones.conname).toBe('fk_sesiones_admin_administrador');
        expect(restricciones.definicion).toContain(
          'REFERENCES administradores(id)',
        );
        expect(restricciones.definicion).toContain('ON DELETE CASCADE');
      });

      it('exige que el resumen del identificador tenga formato de SHA-256', async () => {
        await expect(
          repositorio.insert({
            administradorId: ADMINISTRADOR_ID,
            tokenHash: 'un-token-en-claro',
            csrfToken: 'c'.repeat(43),
            creadaEn: new Date(),
            tokenEmitidoEn: new Date(),
            ultimaActividadEn: new Date(),
            expiraEn: new Date(Date.now() + 60_000),
            revocadaEn: null,
            motivoRevocacion: null,
          }),
        ).rejects.toThrow();
      });
    });

    describe('protecciones del historial de migraciones', () => {
      it('tiene Row Level Security activado y ninguna política', async () => {
        const [estado] = await dataSource.query(
          `SELECT c.relrowsecurity AS rls,
                  (SELECT count(*)::int FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'migrations') AS politicas
             FROM pg_class c
            WHERE c.oid = 'public.migrations'::regclass`,
        );

        expect(estado.rls).toBe(true);
        expect(estado.politicas).toBe(0);
      });

      it('no concede ningún privilegio a los roles de la Data API', async () => {
        const roles = await dataSource.query(
          `SELECT rolname FROM pg_roles
            WHERE rolname IN ('anon', 'authenticated', 'service_role')`,
        );

        for (const rol of roles) {
          for (const tabla of ['sesiones_admin', 'migrations']) {
            const [permisos] = await dataSource.query(
              `SELECT has_table_privilege($1, $2, 'SELECT') AS puede_leer,
                      has_table_privilege($1, $2, 'INSERT') AS puede_insertar,
                      has_table_privilege($1, $2, 'UPDATE') AS puede_actualizar,
                      has_table_privilege($1, $2, 'DELETE') AS puede_borrar`,
              [rol.rolname, `public.${tabla}`],
            );

            expect(permisos.puede_leer).toBe(false);
            expect(permisos.puede_insertar).toBe(false);
            expect(permisos.puede_actualizar).toBe(false);
            expect(permisos.puede_borrar).toBe(false);
          }
        }
      });

      it('no concede ningún privilegio a PUBLIC en ninguna de las dos tablas', async () => {
        const filas = await dataSource.query(`
          SELECT c.relname AS tabla,
                 EXISTS (
                   SELECT 1
                     FROM aclexplode(c.relacl) AS permiso
                    WHERE permiso.grantee = 0
                      AND permiso.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
                 ) AS public_tiene_privilegios
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public'
             AND c.relname IN ('sesiones_admin', 'migrations')
        `);

        expect(filas).toHaveLength(2);
        for (const fila of filas) {
          expect(fila.public_tiene_privilegios).toBe(false);
        }
      });

      it('protege también la secuencia del historial', async () => {
        const [estado] = await dataSource.query(
          `SELECT to_regclass('public.migrations_id_seq') IS NOT NULL AS existe`,
        );

        expect(estado.existe).toBe(true);

        const roles = await dataSource.query(
          `SELECT rolname FROM pg_roles
            WHERE rolname IN ('anon', 'authenticated', 'service_role')`,
        );

        for (const rol of roles) {
          const [permisos] = await dataSource.query(
            `SELECT has_sequence_privilege($1, 'public.migrations_id_seq', 'USAGE') AS puede_usar,
                    has_sequence_privilege($1, 'public.migrations_id_seq', 'SELECT') AS puede_leer,
                    has_sequence_privilege($1, 'public.migrations_id_seq', 'UPDATE') AS puede_actualizar`,
            [rol.rolname],
          );

          expect(permisos.puede_usar).toBe(false);
          expect(permisos.puede_leer).toBe(false);
          expect(permisos.puede_actualizar).toBe(false);
        }
      });

      it('el rol del backend conserva acceso completo a ambas tablas', async () => {
        for (const tabla of ['sesiones_admin', 'migrations']) {
          const [permisos] = await dataSource.query(
            `SELECT has_table_privilege(current_user, $1, 'SELECT') AS puede_leer,
                    has_table_privilege(current_user, $1, 'INSERT') AS puede_insertar,
                    has_table_privilege(current_user, $1, 'UPDATE') AS puede_actualizar,
                    has_table_privilege(current_user, $1, 'DELETE') AS puede_borrar`,
            [`public.${tabla}`],
          );

          expect(permisos.puede_leer).toBe(true);
          expect(permisos.puede_insertar).toBe(true);
          expect(permisos.puede_actualizar).toBe(true);
          expect(permisos.puede_borrar).toBe(true);
        }
      });

      it('usa el esquema exacto que TypeORM espera para el historial', async () => {
        const columnas = await dataSource.query(
          `SELECT column_name, data_type, is_nullable, column_default
             FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'migrations'
            ORDER BY ordinal_position`,
        );

        expect(columnas).toHaveLength(3);
        expect(columnas[0]).toMatchObject({
          column_name: 'id',
          data_type: 'integer',
          is_nullable: 'NO',
        });
        expect(columnas[0].column_default).toContain('migrations_id_seq');
        expect(columnas[1]).toMatchObject({
          column_name: 'timestamp',
          data_type: 'bigint',
        });
        expect(columnas[2]).toMatchObject({
          column_name: 'name',
          data_type: 'character varying',
        });

        const [restricciones] = await dataSource.query(
          `SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.migrations'::regclass AND contype = 'p'`,
        );

        expect(restricciones.conname).toBe('PK_8c82d7f526340ab734260ea46be');
      });

      it('mantiene un historial consistente con la migración aplicada', async () => {
        const historial = await dataSource.query(
          `SELECT name FROM public.migrations ORDER BY id`,
        );

        expect(historial.map((fila) => fila.name)).toContain(
          'CrearTablaSesionesAdmin1730000000000',
        );
      });
    });
  },
);
