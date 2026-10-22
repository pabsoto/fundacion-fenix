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

CREATE TABLE IF NOT EXISTS public.datos_donacion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titular text NOT NULL,
  banco text NOT NULL,
  telefono text NOT NULL,
  referencia text NOT NULL,
  numero_cuenta text,
  qr_ruta text,
  qr_vence_el date,
  aviso_es text,
  aviso_en text,
  activo boolean NOT NULL DEFAULT false,
  creado_por uuid,
  actualizado_por uuid,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT datos_donacion_pkey PRIMARY KEY (id),
  CONSTRAINT datos_donacion_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.administradores(id) ON DELETE RESTRICT,
  CONSTRAINT datos_donacion_actualizado_por_fkey
    FOREIGN KEY (actualizado_por) REFERENCES public.administradores(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_datos_donacion_un_solo_activo
  ON public.datos_donacion (activo)
  WHERE activo = true;

CREATE TABLE IF NOT EXISTS public.auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  administrador_id uuid,
  tabla text NOT NULL,
  registro_id uuid,
  accion text NOT NULL,
  campos_modificados text[],
  datos_antes jsonb,
  datos_despues jsonb,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_pkey PRIMARY KEY (id),
  CONSTRAINT auditoria_administrador_id_fkey
    FOREIGN KEY (administrador_id) REFERENCES public.administradores(id) ON DELETE RESTRICT,
  CONSTRAINT ck_auditoria_accion
    CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX IF NOT EXISTS ix_auditoria_creado_en
  ON public.auditoria (creado_en);

CREATE INDEX IF NOT EXISTS ix_auditoria_tabla_registro
  ON public.auditoria (tabla, registro_id);
