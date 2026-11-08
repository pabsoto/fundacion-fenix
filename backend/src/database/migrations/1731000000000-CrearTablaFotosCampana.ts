import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTablaFotosCampana1731000000000 implements MigrationInterface {
  name = 'CrearTablaFotosCampana1731000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.fotos_campana (
        id           uuid        NOT NULL DEFAULT gen_random_uuid(),
        campana_id   uuid        NOT NULL,
        ruta         text        NOT NULL,
        content_type text        NOT NULL,
        tamano       integer     NOT NULL,
        orden        integer     NOT NULL,
        creado_por   uuid,
        creado_en    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fotos_campana_pkey PRIMARY KEY (id),
        CONSTRAINT fotos_campana_ruta_key UNIQUE (ruta),
        CONSTRAINT ck_fotos_campana_tamano CHECK (tamano > 0),
        CONSTRAINT fotos_campana_campana_id_fkey FOREIGN KEY (campana_id)
          REFERENCES public.campanas (id) ON DELETE CASCADE,
        CONSTRAINT fotos_campana_creado_por_fkey FOREIGN KEY (creado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_fotos_campana_campana_orden
        ON public.fotos_campana (campana_id, orden)
    `);

    await queryRunner.query(`
      ALTER TABLE public.fotos_campana ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      REVOKE ALL ON TABLE public.fotos_campana FROM PUBLIC
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.fotos_campana FROM anon';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.fotos_campana FROM authenticated';
        END IF;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          EXECUTE 'REVOKE ALL ON TABLE public.fotos_campana FROM service_role';
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
         WHERE oid = 'public.fotos_campana'::regclass;

        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fotos_campana TO %I',
          propietario
        );

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fotos_campana TO postgres';
        END IF;
      END
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS public.fotos_campana');
  }
}
