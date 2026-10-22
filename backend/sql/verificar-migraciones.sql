-- =====================================================================
-- Fundación FÉNIX LPB — verificación de las tablas de migraciones
-- =====================================================================
-- Consultas de SOLO LECTURA para comprobar, después de aplicar las
-- migraciones, que:
--
--   * `public.sesiones_admin` existe, tiene el esquema esperado y NO es
--     accesible desde el frontend ni desde los roles públicos de Supabase;
--   * `public.migrations` (historial de migraciones de TypeORM) también está
--     protegida: RLS activo, sin políticas y sin privilegios para `anon`,
--     `authenticated`, `service_role` ni `PUBLIC`;
--   * la secuencia `public.migrations_id_seq` está protegida;
--   * las tablas existentes siguen intactas.
--
-- Ninguna de estas consultas modifica datos. Se pueden ejecutar tanto desde
-- el editor SQL de Supabase como desde `psql`.
--
-- Resultado esperado de cada bloque:
--   1) exists = true (las dos tablas)
--   2) RLS activo = true y políticas = 0 en las dos tablas
--   3) puede_leer/insertar/actualizar/borrar = false para anon, authenticated
--      y service_role en las dos tablas
--   4) public_tiene_privilegios = false en las dos tablas
--   5) la secuencia no tiene privilegios para los roles públicos
--   6) el rol del backend conserva acceso completo a las dos tablas
--   7) una fila por migración aplicada en el historial
--   8) las tablas existentes siguen intactas
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EXISTENCIA DE LAS DOS TABLAS
-- ---------------------------------------------------------------------
SELECT
  c.relname                                   AS tabla,
  pg_get_userbyid(c.relowner)                AS propietario,
  c.relrowsecurity                            AS rls_activo,
  c.relforcerowsecurity                      AS rls_forzado,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = c.relname) AS columnas,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname)    AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sesiones_admin', 'migrations')
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ---------------------------------------------------------------------
-- 2) ROW LEVEL SECURITY EN LAS DOS TABLAS
--     Ninguna política puede conceder acceso a un visitante.
-- ---------------------------------------------------------------------
SELECT
  c.relname                                   AS tabla,
  c.relrowsecurity                            AS rls_activo,
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname) AS politicas,
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname
      AND 'anon' = ANY (roles))                          AS politicas_anon,
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname
      AND 'authenticated' = ANY (roles))                  AS politicas_authenticated,
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'public' AND tablename = c.relname
      AND 'service_role' = ANY (roles))                   AS politicas_service_role
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sesiones_admin', 'migrations')
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ---------------------------------------------------------------------
-- 3) PERMISOS EFECTIVOS PARA LOS ROLES DE LA DATA API
--     Todos deben ser false en las dos tablas.
-- ---------------------------------------------------------------------
SELECT
  rol.nombre,
  tabla.nombre AS tabla,
  has_table_privilege(rol.nombre, tabla.nombre, 'SELECT') AS puede_leer,
  has_table_privilege(rol.nombre, tabla.nombre, 'INSERT') AS puede_insertar,
  has_table_privilege(rol.nombre, tabla.nombre, 'UPDATE') AS puede_actualizar,
  has_table_privilege(rol.nombre, tabla.nombre, 'DELETE') AS puede_borrar
FROM (
  VALUES ('anon'), ('authenticated'), ('service_role')
) AS rol(nombre)
CROSS JOIN (
  VALUES ('public.sesiones_admin'), ('public.migrations')
) AS tabla(nombre)
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol.nombre)
ORDER BY tabla.nombre, rol.nombre;

-- ---------------------------------------------------------------------
-- 4) PERMISOS DE PUBLIC
--     PUBLIC no es un rol del catálogo: se comprueba sobre el ACL, donde
--     grantee = 0 identifica a PUBLIC.
-- ---------------------------------------------------------------------
SELECT
  c.relname AS tabla,
  EXISTS (
    SELECT 1
      FROM pg_class c2,
           aclexplode(c2.relacl) AS permiso
     WHERE c2.oid = c.oid
       AND permiso.grantee = 0
       AND permiso.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) AS public_tiene_privilegios
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sesiones_admin', 'migrations')
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ACL efectivo de cada tabla (no debe aparecer anon, authenticated ni service_role)
SELECT c.relname AS tabla, c.relacl::text[] AS acl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sesiones_admin', 'migrations')
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ---------------------------------------------------------------------
-- 5) SECUENCIA DEL HISTORIAL DE MIGRACIONES
--     Los permisos por defecto de Supabase también afectan a las
--     secuencias: debe estar protegida como la tabla.
-- ---------------------------------------------------------------------
SELECT
  r.rolname,
  has_sequence_privilege(r.rolname, 'public.migrations_id_seq', 'USAGE')  AS puede_usar,
  has_sequence_privilege(r.rolname, 'public.migrations_id_seq', 'SELECT') AS puede_leer,
  has_sequence_privilege(r.rolname, 'public.migrations_id_seq', 'UPDATE') AS puede_actualizar
FROM pg_roles r
WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY r.rolname;

-- ---------------------------------------------------------------------
-- 6) ACCESO DESDE LA CUENTA QUE USA EL BACKEND
--     current_user es la cuenta con la que el backend se conecta.
-- ---------------------------------------------------------------------
SELECT
  current_user                              AS rol_del_backend,
  current_setting('is_superuser')           AS es_superusuario,
  r.rolbypassrls                           AS salta_rls,
  has_table_privilege(current_user, 'public.sesiones_admin', 'SELECT') AS sesiones_leer,
  has_table_privilege(current_user, 'public.sesiones_admin', 'INSERT') AS sesiones_insertar,
  has_table_privilege(current_user, 'public.sesiones_admin', 'UPDATE') AS sesiones_actualizar,
  has_table_privilege(current_user, 'public.sesiones_admin', 'DELETE') AS sesiones_borrar,
  has_table_privilege(current_user, 'public.migrations', 'SELECT')      AS historial_leer,
  has_table_privilege(current_user, 'public.migrations', 'INSERT')      AS historial_insertar,
  has_table_privilege(current_user, 'public.migrations', 'UPDATE')      AS historial_actualizar,
  has_table_privilege(current_user, 'public.migrations', 'DELETE')      AS historial_borrar
FROM pg_roles r
WHERE r.rolname = current_user;

-- ---------------------------------------------------------------------
-- 7) HISTORIAL DE MIGRACIONES DE TYPEORM
-- ---------------------------------------------------------------------
SELECT id, timestamp, name
FROM public.migrations
ORDER BY id;

-- ---------------------------------------------------------------------
-- 8) ESQUEMA DETALLADO (columnas, restricciones e índices)
-- ---------------------------------------------------------------------
SELECT
  table_name AS tabla,
  ordinal_position AS posicion,
  column_name      AS columna,
  data_type        AS tipo,
  is_nullable      AS admite_nulos,
  column_default   AS valor_por_defecto
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sesiones_admin', 'migrations')
ORDER BY table_name, ordinal_position;

SELECT
  c.relname AS tabla,
  con.conname AS restriccion,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    ELSE con.contype::text
  END AS tipo,
  pg_get_constraintdef(con.oid) AS definicion
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('sesiones_admin', 'migrations')
ORDER BY tabla, con.conname;

SELECT tablename AS tabla, indexname AS indice, indexdef AS definicion
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sesiones_admin', 'migrations')
ORDER BY tabla, indexname;

-- ---------------------------------------------------------------------
-- 9) COMPROBACIÓN DE QUE NO SE HA TOCADO NINGUNA TABLA EXISTENTE
--     `typeorm_metadata` sólo la crea TypeORM si el proyecto tiene vistas o
--     columnas generadas: este proyecto no tiene ninguna de las dos cosas.
-- ---------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE')  AS tablas_en_public,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sesiones_admin') AS sesiones_admin,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'migrations')     AS migrations,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'typeorm_metadata') AS typeorm_metadata,
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'administradores')  AS administradores;
