import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaAnimales1732000000000 implements MigrationInterface {
  name = 'CrearTablaAnimales1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        tabla text;
        con_filas boolean;
      BEGIN
        FOREACH tabla IN ARRAY ARRAY['adopciones', 'adoptantes', 'animales']
        LOOP
          IF to_regclass('public.' || tabla) IS NOT NULL THEN
            EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', tabla)
              INTO con_filas;
            IF con_filas THEN
              RAISE EXCEPTION 'La tabla % contiene datos; no se puede reemplazar', tabla;
            END IF;
          END IF;
        END LOOP;
      END
      $$
    `);

    await queryRunner.query('DROP TABLE IF EXISTS public.adopciones');
    await queryRunner.query('DROP TABLE IF EXISTS public.adoptantes');
    await queryRunner.query('DROP TABLE IF EXISTS public.animales');

    await queryRunner.query(`
      CREATE TABLE public.animales (
        id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
        nombre                    text        NOT NULL,
        especie                   text        NOT NULL,
        sexo                      text,
        edad                      integer,
        edad_unidad               text,
        fecha_ingreso             date,
        adoptado                  boolean     NOT NULL DEFAULT false,
        nombre_adoptante          text,
        direccion_adoptante       text,
        fecha_adopcion            date,
        foto_animal_ruta          text,
        foto_animal_content_type  text,
        foto_animal_tamano        integer,
        foto_entrega_ruta         text,
        foto_entrega_content_type text,
        foto_entrega_tamano       integer,
        creado_por                uuid,
        actualizado_por           uuid,
        eliminado_por             uuid,
        creado_en                 timestamptz NOT NULL DEFAULT now(),
        actualizado_en            timestamptz NOT NULL DEFAULT now(),
        eliminado_en              timestamptz,
        CONSTRAINT animales_pkey PRIMARY KEY (id),
        CONSTRAINT animales_foto_animal_ruta_key UNIQUE (foto_animal_ruta),
        CONSTRAINT animales_foto_entrega_ruta_key UNIQUE (foto_entrega_ruta),
        CONSTRAINT ck_animales_nombre_no_vacio CHECK (length(btrim(nombre)) > 0),
        CONSTRAINT ck_animales_especie CHECK (especie IN ('perro', 'gato')),
        CONSTRAINT ck_animales_sexo CHECK (sexo IS NULL OR sexo IN ('macho', 'hembra')),
        CONSTRAINT ck_animales_edad CHECK (edad IS NULL OR edad >= 0),
        CONSTRAINT ck_animales_edad_unidad CHECK (
          (edad IS NULL AND edad_unidad IS NULL)
          OR (edad IS NOT NULL AND edad_unidad IN ('anios', 'meses'))
        ),
        CONSTRAINT ck_animales_foto_animal_completa CHECK (
          (foto_animal_ruta IS NULL AND foto_animal_content_type IS NULL AND foto_animal_tamano IS NULL)
          OR (foto_animal_ruta IS NOT NULL AND foto_animal_content_type IS NOT NULL AND foto_animal_tamano > 0)
        ),
        CONSTRAINT ck_animales_foto_entrega_completa CHECK (
          (foto_entrega_ruta IS NULL AND foto_entrega_content_type IS NULL AND foto_entrega_tamano IS NULL)
          OR (foto_entrega_ruta IS NOT NULL AND foto_entrega_content_type IS NOT NULL AND foto_entrega_tamano > 0)
        ),
        CONSTRAINT ck_animales_datos_adopcion CHECK (
          adoptado
          OR (
            nombre_adoptante IS NULL
            AND direccion_adoptante IS NULL
            AND fecha_adopcion IS NULL
            AND foto_entrega_ruta IS NULL
          )
        ),
        CONSTRAINT animales_creado_por_fkey FOREIGN KEY (creado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT animales_actualizado_por_fkey FOREIGN KEY (actualizado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT animales_eliminado_por_fkey FOREIGN KEY (eliminado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX ix_animales_activos_creado_en
        ON public.animales (creado_en DESC)
        WHERE eliminado_en IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.animales ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      REVOKE ALL ON TABLE public.animales FROM PUBLIC
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.animales FROM anon';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.animales FROM authenticated';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.animales FROM service_role';
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
         WHERE oid = 'public.animales'::regclass;

        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.animales TO %I',
          propietario
        );

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.animales TO postgres';
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS public.animales');
  }
}
