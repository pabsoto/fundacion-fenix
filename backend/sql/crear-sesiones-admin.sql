-- =====================================================================
-- Fundación FÉNIX LPB — tabla de sesiones administrativas
-- =====================================================================
-- Creación de `public.sesiones_admin`.
--
-- IMPORTANTE
--   Esta migración NO se ha aplicado en la base de datos de Supabase.
--   Queda PENDIENTE DE AUTORIZACIÓN explícita antes de ejecutarla.
--
--   No modifica ni elimina ninguna tabla existente: sólo crea una tabla
--   nueva. La única dependencia es una clave foránea *hacia*
--   `public.administradores`, que ya existe y no se toca.
--
--   Este archivo es el ESPEJO EXACTO de la migración TypeORM versionada:
--     backend/src/database/migrations/1730000000000-CrearTablaSesionesAdmin.ts
--   La prueba `backend/src/database/migrations/migraciones-equivalencia.spec.ts`
--   verifica que ambas versiones contienen exactamente las mismas sentencias.
--
-- PROCEDIMIENTO OFICIAL DE APLICACIÓN
--   `npm run db:migrate` (migración TypeORM). Registra la migración en el
--   historial de la tabla `migrations`. Este archivo SQL es para revisión y
--   para emergencias: si se aplica a mano, hay que reconciliar después el
--   historial con `npm run db:migrate` (idempotente) para que TypeORM no
--   intente volver a aplicarla.
--
-- PROTECCIONES
--   - Row Level Security activado y sin políticas.
--   - Sin privilegios para PUBLIC, anon, authenticated ni service_role.
--   - Privilegios de escritura para el propietario y para `postgres` (la
--     cuenta del backend). El backend usa PostgreSQL directamente y no la
--     Data API, así que `service_role` no necesita acceso (privilegios
--     mínimos).
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sesiones_admin (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  administrador_id    uuid        NOT NULL,
  -- Resumen SHA-256 del identificador de sesión: nunca se guarda el token.
  token_hash          text        NOT NULL,
  -- Token anti-CSRF ligado a la sesión (no es una credencial de acceso).
  csrf_token          text        NOT NULL,
  creada_en           timestamptz NOT NULL DEFAULT now(),
  token_emitido_en    timestamptz NOT NULL DEFAULT now(),
  ultima_actividad_en timestamptz NOT NULL DEFAULT now(),
  expira_en           timestamptz NOT NULL,
  revocada_en         timestamptz,
  motivo_revocacion   text,
  CONSTRAINT sesiones_admin_pkey PRIMARY KEY (id),
  CONSTRAINT sesiones_admin_token_hash_key UNIQUE (token_hash),
  CONSTRAINT ck_sesiones_admin_expira_posterior_creacion CHECK (expira_en > creada_en),
  CONSTRAINT ck_sesiones_admin_revocation_coherente CHECK ((revocada_en IS NULL) = (motivo_revocacion IS NULL)),
  CONSTRAINT ck_sesiones_admin_token_hash_formato CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_sesiones_admin_csrf_token_formato CHECK (length(csrf_token) BETWEEN 32 AND 128)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'fk_sesiones_admin_administrador'
       AND conrelid = 'public.sesiones_admin'::regclass
  ) THEN
    ALTER TABLE public.sesiones_admin
      ADD CONSTRAINT fk_sesiones_admin_administrador
      FOREIGN KEY (administrador_id)
      REFERENCES public.administradores (id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS ix_sesiones_admin_administrador_id
  ON public.sesiones_admin (administrador_id);

CREATE INDEX IF NOT EXISTS ix_sesiones_admin_expira_en
  ON public.sesiones_admin (expira_en);

-- Row Level Security: sin políticas, ningún rol de la Data API obtiene filas.
ALTER TABLE public.sesiones_admin ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.sesiones_admin FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sesiones_admin FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sesiones_admin FROM authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.sesiones_admin FROM service_role';
  END IF;
END
$$;

DO $$
DECLARE
  propietario text;
BEGIN
  SELECT pg_get_userbyid(relowner) INTO propietario
    FROM pg_class
   WHERE oid = 'public.sesiones_admin'::regclass;

  EXECUTE format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sesiones_admin TO %I',
    propietario
  );

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sesiones_admin TO postgres';
  END IF;
END
$$;

COMMIT;
