-- Esquema mínimo para las pruebas aisladas del backend.
-- Reproduce la tabla `public.administradores` de Supabase (verificada por
-- inspección de sólo lectura) y aplica la migración de sesiones.

CREATE TABLE IF NOT EXISTS public.administradores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nombre text NOT NULL,
  google_sub text,
  activo boolean NOT NULL DEFAULT true,
  ultimo_acceso timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT administradores_pkey PRIMARY KEY (id),
  CONSTRAINT administradores_email_key UNIQUE (email),
  CONSTRAINT administradores_google_sub_key UNIQUE (google_sub),
  CONSTRAINT ck_administradores_email_minuscula CHECK (email = lower(email)),
  CONSTRAINT ck_administradores_nombre_no_vacio CHECK (length(btrim(nombre)) > 0)
);

INSERT INTO public.administradores (id, email, nombre, google_sub, activo)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'administrador@fundacionfenix.org', 'Administración FÉNIX', 'sub-google-1', true),
  ('22222222-2222-2222-2222-222222222222', 'respaldo@fundacionfenix.org', 'Respaldo FÉNIX', 'sub-google-2', true)
ON CONFLICT (id) DO NOTHING;
