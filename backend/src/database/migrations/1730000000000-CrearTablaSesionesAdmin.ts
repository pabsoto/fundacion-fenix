import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla `public.sesiones_admin`, donde se persisten las sesiones
 * administrativas.
 *
 * La tabla es **nueva**: no modifica ni elimina ninguna tabla existente. El
 * identificador de sesión que recibe el navegador nunca se almacena: sólo su
 * resumen SHA-256, de modo que un volcado de la tabla no permita suplantar
 * una sesión.
 *
 * Protecciones aplicadas (idénticas a las del resto de tablas de `public`):
 *
 * - Row Level Security **activado** y **sin ninguna política**: los roles de
 *   la Data API (`anon`, `authenticated`) no obtienen ninguna fila.
 * - Sin privilegios para `PUBLIC`, `anon`, `authenticated` ni `service_role`.
 * - Privilegios de escritura sólo para el propietario de la tabla y para el
 *   rol `postgres` (la cuenta que usa el backend a través del pooler).
 *
 * Se sigue el principio de privilegios mínimos: el backend se conecta a
 * PostgreSQL directamente y no usa la Data API de Supabase, de modo que
 * `service_role` no necesita acceso a esta tabla.
 *
 * La migración NO se ha aplicado en la base de datos de Supabase: queda
 * pendiente de autorización explícita. El procedimiento oficial de
 * aplicación es `npm run db:migrate` (ver `src/scripts/aplicar-migraciones.ts`),
 * que además registra la migración en el historial de TypeORM.
 *
 * El archivo `backend/sql/crear-sesiones-admin.sql` es el espejo exacto de
 * esta migración para revisión y para emergencies; la prueba
 * `migraciones-equivalencia.spec.ts` verifica que ambos no se separan.
 */
export class CrearTablaSesionesAdmin1730000000000 implements MigrationInterface {
  name = 'CrearTablaSesionesAdmin1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.sesiones_admin (
        id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
        administrador_id    uuid        NOT NULL,
        token_hash          text        NOT NULL,
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
      )
    `);

    await queryRunner.query(`
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
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_sesiones_admin_administrador_id
        ON public.sesiones_admin (administrador_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_sesiones_admin_expira_en
        ON public.sesiones_admin (expira_en)
    `);

    await queryRunner.query(`
      ALTER TABLE public.sesiones_admin ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      REVOKE ALL ON TABLE public.sesiones_admin FROM PUBLIC
    `);

    await queryRunner.query(`
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
      $$
    `);

    await queryRunner.query(`
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
      $$
    `);
  }

  /**
   * Reversión.
   *
   * Elimina **sólo** `public.sesiones_admin` (y, en cascada, sus índices y
   * restricciones). No toca ninguna otra tabla: la clave foránea apunta *a*
   * `administradores`, de modo que la tabla de sesiones es la dependiente y
   * puede eliminarse sin afectar a `administradores` ni a sus datos.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS public.sesiones_admin');
  }
}
