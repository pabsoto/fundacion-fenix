import type { DataSource } from 'typeorm';

/**
 * Creación y protección de `public.migrations`, la tabla que TypeORM usa
 * como historial de migraciones ejecutadas.
 *
 * ## Por qué hay que protegerla
 *
 * TypeORM crea esa tabla por su cuenta la primera vez que se ejecuta una
 * migración, **fuera** de la transacción de la migración y **sin ninguna
 * protección**: con los permisos por defecto de Supabase, toda tabla nueva
 * del esquema `public` hereda `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` para
 * `anon` y `authenticated`. Eso dejaría el historial de migraciones
 * escribible desde la Data API: un visitante podría borrar la fila de una
 * migración aplicada (y TypeORM volvería a ejecutarla) o insertar una fila
 * (y TypeORM creería que ya está aplicada).
 *
 * ## Estrategia
 *
 * - La tabla se crea **con el mismo esquema exacto** que genera TypeORM
 *   (`id SERIAL`, `timestamp bigint`, `name varchar`, PK
 *   `PK_8c82d7f526340ab734260ea46be`), de modo que TypeORM la reconoce y la
 *   utiliza sin cambios.
 * - La creación y **todas** las protecciones se ejecutan dentro de una
 *   única transacción: la tabla nunca es visible para otra sesión en un
 *   estado desprotegido. No hay ventana de exposición.
 * - `Row Level Security` activado y **sin políticas**.
 * - Sin privilegios para `PUBLIC`, `anon`, `authenticated` ni
 *   `service_role` (principio de privilegios mínimos: el backend usa
 *   PostgreSQL directamente y no la Data API).
 * - La secuencia `public.migrations_id_seq` queda igualmente protegida: los
 *   permisos por defecto de Supabase también conceden `USAGE`/`SELECT` sobre
 *   las secuencias nuevas.
 * - Se conservan los privilegios del rol que ejecuta las migraciones
 *   (propietario de la tabla y rol `postgres`).
 *
 * No se modifica ningún privilegio por defecto global de Supabase: todo es
 * explícito y por tabla.
 */

export const TABLA_MIGRATIONS = 'public.migrations';
export const SECUENCIA_MIGRATIONS = 'public.migrations_id_seq';

/**
 * Nombre de la clave primaria que genera la estrategia de nombres por defecto
 * de TypeORM: `PK_` + sha1('migrations_id').slice(0, 27).
 */
export const CLAVE_PRIMARIA_MIGRATIONS = 'PK_8c82d7f526340ab734260ea46be';

/**
 * Sentencias que crean (si no existe) y protegen `public.migrations`.
 *
 * Son idempotentes: se pueden ejecutar tantas veces como sea necesario sin
 * alterar el historial ni el esquema.
 */
export const SQL_PROTEGER_MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS public.migrations (
     id        SERIAL  NOT NULL,
     timestamp bigint  NOT NULL,
     name      varchar NOT NULL,
     CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
   )`,
  `ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY`,
  `REVOKE ALL ON TABLE public.migrations FROM PUBLIC`,
  `DO $$
   BEGIN
     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
       EXECUTE 'REVOKE ALL ON TABLE public.migrations FROM anon';
     END IF;

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
       EXECUTE 'REVOKE ALL ON TABLE public.migrations FROM authenticated';
     END IF;

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
       EXECUTE 'REVOKE ALL ON TABLE public.migrations FROM service_role';
     END IF;
   END
   $$`,
  `DO $$
   DECLARE
     propietario text;
   BEGIN
     SELECT pg_get_userbyid(relowner) INTO propietario
       FROM pg_class
      WHERE oid = 'public.migrations'::regclass;

     EXECUTE format(
       'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.migrations TO %I',
       propietario
     );

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
       EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.migrations TO postgres';
     END IF;
   END
   $$`,
  `DO $$
   DECLARE
     propietario text;
   BEGIN
     IF to_regclass('public.migrations_id_seq') IS NULL THEN
       RETURN;
     END IF;

     SELECT pg_get_userbyid(relowner) INTO propietario
       FROM pg_class
      WHERE oid = 'public.migrations_id_seq'::regclass;

     EXECUTE 'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM PUBLIC';

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
       EXECUTE 'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM anon';
     END IF;

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
       EXECUTE 'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM authenticated';
     END IF;

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
       EXECUTE 'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM service_role';
     END IF;

     EXECUTE format(
       'GRANT USAGE, SELECT ON SEQUENCE public.migrations_id_seq TO %I',
       propietario
     );

     IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
       EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.migrations_id_seq TO postgres';
     END IF;
   END
   $$`,
];

/**
 * Crea `public.migrations` y le aplica todas las protecciones en una única
 * transacción, de modo que la tabla nunca exista en un estado desprotegido.
 *
 * Es idempotente: si la tabla ya existe (por ejemplo, creada por el propio
 * TypeORM en una ejecución anterior), sólo se corrigen sus privilegios.
 */
export async function asegurarTablaMigrations(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.transaction(async (manager) => {
    for (const sentencia of SQL_PROTEGER_MIGRATIONS) {
      await manager.query(sentencia);
    }
  });
}

/** Estado de protección de `public.migrations`, para el informe del script. */
export interface EstadoProteccionMigrations {
  readonly existe: boolean;
  readonly rlsActivo: boolean;
  readonly politicas: number;
  /** `true` si algún rol de la Data API conserva acceso de lectura. */
  readonly visitantesConLectura: boolean;
  readonly rolConAcceso: string | null;
}

/** Lee el estado de protección de `public.migrations` (sólo lectura). */
export async function leerEstadoProteccionMigrations(
  dataSource: DataSource,
): Promise<EstadoProteccionMigrations> {
  const [existe] = await dataSource.query(
    `SELECT to_regclass('public.migrations') IS NOT NULL AS existe`,
  );

  if (!existe?.existe) {
    return {
      existe: false,
      rlsActivo: false,
      politicas: 0,
      visitantesConLectura: false,
      rolConAcceso: null,
    };
  }

  const [estado] = await dataSource.query(`
    SELECT
      c.relrowsecurity AS rls,
      (SELECT count(*)::int FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'migrations') AS politicas,
      EXISTS (
        SELECT 1 FROM pg_roles
         WHERE rolname IN ('anon', 'authenticated', 'service_role')
           AND has_table_privilege(rolname, 'public.migrations', 'SELECT')
      ) AS visitantes_con_lectura
    FROM pg_class c
   WHERE c.oid = 'public.migrations'::regclass
  `);

  const [propietario] = await dataSource.query(
    `SELECT pg_get_userbyid(relowner) AS propietario FROM pg_class WHERE oid = 'public.migrations'::regclass`,
  );

  return {
    existe: true,
    rlsActivo: Boolean(estado?.rls),
    politicas: Number(estado?.politicas ?? 0),
    visitantesConLectura: Boolean(estado?.visitantes_con_lectura),
    rolConAcceso: (propietario?.propietario as string) ?? null,
  };
}
