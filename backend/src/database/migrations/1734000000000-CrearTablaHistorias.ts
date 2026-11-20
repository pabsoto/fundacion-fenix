import type { MigrationInterface, QueryRunner } from 'typeorm';


export class CrearTablaHistorias1734000000000 implements MigrationInterface {
  name = 'CrearTablaHistorias1734000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.historias (
        id                uuid        NOT NULL DEFAULT gen_random_uuid(),
        animal_nombre     text        NOT NULL,
        titulo_es         text        NOT NULL,
        titulo_en         text        NOT NULL,
        texto_es          text        NOT NULL,
        texto_en          text        NOT NULL,
        autor_nombre      text,
        fecha_historia    date        NOT NULL,
        foto_ruta         text,
        foto_content_type text,
        foto_tamano       integer,
        foto_ancho        integer,
        foto_alto         integer,
        orden             integer     NOT NULL DEFAULT 0,
        visible           boolean     NOT NULL DEFAULT false,
        creado_por        uuid,
        actualizado_por   uuid,
        eliminado_por     uuid,
        creado_en         timestamptz NOT NULL DEFAULT now(),
        actualizado_en    timestamptz NOT NULL DEFAULT now(),
        eliminado_en      timestamptz,
        CONSTRAINT historias_pkey PRIMARY KEY (id),
        CONSTRAINT historias_foto_ruta_key UNIQUE (foto_ruta),
        CONSTRAINT ck_historias_animal_nombre_no_vacio CHECK (length(btrim(animal_nombre)) > 0),
        CONSTRAINT ck_historias_titulo_es_no_vacio CHECK (length(btrim(titulo_es)) > 0),
        CONSTRAINT ck_historias_titulo_en_no_vacio CHECK (length(btrim(titulo_en)) > 0),
        CONSTRAINT ck_historias_texto_es_no_vacio CHECK (length(btrim(texto_es)) > 0),
        CONSTRAINT ck_historias_texto_en_no_vacio CHECK (length(btrim(texto_en)) > 0),
        CONSTRAINT ck_historias_autor_no_vacio CHECK (autor_nombre IS NULL OR length(btrim(autor_nombre)) > 0),
        CONSTRAINT ck_historias_orden CHECK (orden >= 0),
        CONSTRAINT ck_historias_foto_completa CHECK (
          (foto_ruta IS NULL AND foto_content_type IS NULL AND foto_tamano IS NULL AND foto_ancho IS NULL AND foto_alto IS NULL)
          OR (foto_ruta IS NOT NULL AND foto_content_type IS NOT NULL AND foto_tamano > 0 AND foto_ancho > 0 AND foto_alto > 0)
        ),
        CONSTRAINT historias_creado_por_fkey FOREIGN KEY (creado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT historias_actualizado_por_fkey FOREIGN KEY (actualizado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT historias_eliminado_por_fkey FOREIGN KEY (eliminado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_historias_activas_orden
        ON public.historias (orden, fecha_historia DESC)
        WHERE eliminado_en IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_historias_actualizado_en'
             AND tgrelid = 'public.historias'::regclass
        ) THEN
          CREATE TRIGGER trg_historias_actualizado_en
            BEFORE UPDATE ON public.historias
            FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_actualizado_en();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_historias_auditoria'
             AND tgrelid = 'public.historias'::regclass
        ) THEN
          CREATE TRIGGER trg_historias_auditoria
            AFTER INSERT OR DELETE OR UPDATE ON public.historias
            FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria('completo');
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      ALTER TABLE public.historias ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      REVOKE ALL ON TABLE public.historias FROM PUBLIC
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.historias FROM anon';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.historias FROM authenticated';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.historias FROM service_role';
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
         WHERE oid = 'public.historias'::regclass;

        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.historias TO %I',
          propietario
        );

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.historias TO postgres';
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS public.historias');
  }
}
