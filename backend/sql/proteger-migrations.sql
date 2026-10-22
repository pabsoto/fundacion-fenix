-- =====================================================================
-- Fundación FÉNIX LPB — protección del historial de migraciones
-- =====================================================================
-- Crea (si no existe) `public.migrations` con el esquema EXACTO que espera
-- TypeORM y le aplica las mismas protecciones que a `public.sesiones_admin`.
--
-- POR QUÉ
--   TypeORM crea por su cuenta la tabla `public.migrations` la primera vez
--   que se ejecuta una migración, fuera de la transacción de la migración y
--   sin ninguna protección. Con los permisos por defecto de Supabase, toda
--   tabla nueva del esquema `public` hereda SELECT/INSERT/UPDATE/DELETE para
--   `anon` y `authenticated`: el historial de migraciones quedaría
--   ESCRIBIBLE desde la Data API.
--
--   Con este archivo, la tabla nace ya protegida. Es idempotente: si ya
--   existe, sólo corrige sus privilegios.
--
-- ESPEJO EXACTO de:
--   backend/src/database/migrations/proteger-migrations.ts
--   (lo verifica backend/src/database/migrations/migraciones-equivalencia.spec.ts)
--
-- USO
--   El procedimiento oficial es `npm run db:migrate -- --confirmar`, que
--   aplica estas mismas sentencias dentro de una transacción antes de ejecutar
--   las migraciones. Este archivo es para revisión y para el caso de que
--   quieras preparar la tabla desde el editor SQL de Supabase.
--
-- NOTA
--   TypeORM sólo crea la tabla `typeorm_metadata` si el proyecto tiene vistas
--   o columnas generadas. Este proyecto no tiene ninguna de las dos cosas,
--   así que esa tabla no llega a existir.
-- =====================================================================

BEGIN;

-- El nombre de la clave primaria es el que genera la estrategia de nombres
-- por defecto de TypeORM: "PK_" + sha1('migrations_id').slice(0, 27).
CREATE TABLE IF NOT EXISTS public.migrations (
  id        SERIAL  NOT NULL,
  timestamp bigint  NOT NULL,
  name      varchar NOT NULL,
  CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);

ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.migrations FROM PUBLIC;

DO $$
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
$$;

DO $$
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
$$;

-- La secuencia también hereda los permisos por defecto de Supabase.
DO $$
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
$$;

COMMIT;
