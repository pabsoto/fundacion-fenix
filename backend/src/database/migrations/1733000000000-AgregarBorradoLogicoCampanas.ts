import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Borrado lógico de campañas: `eliminado_en` / `eliminado_por`.
 *
 * Una campaña eliminada deja de aparecer en el panel, en el sitio público y en
 * los contadores, pero el registro se conserva para auditarlo. Las vistas se
 * recrean con las mismas columnas y un filtro `eliminado_en IS NULL`.
 */
export class AgregarBorradoLogicoCampanas1733000000000 implements MigrationInterface {
  name = 'AgregarBorradoLogicoCampanas1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.campanas
        ADD COLUMN IF NOT EXISTS eliminado_en  timestamptz,
        ADD COLUMN IF NOT EXISTS eliminado_por uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
           WHERE conname = 'campanas_eliminado_por_fkey'
             AND conrelid = 'public.campanas'::regclass
        ) THEN
          ALTER TABLE public.campanas
            ADD CONSTRAINT campanas_eliminado_por_fkey FOREIGN KEY (eliminado_por)
              REFERENCES public.administradores (id) ON DELETE RESTRICT;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanas_activas_fecha
        ON public.campanas (fecha DESC, creado_en DESC)
        WHERE eliminado_en IS NULL
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.v_campanas_resumen
        WITH (security_invoker = true) AS
      SELECT id,
             titulo_es,
             titulo_en,
             lugar,
             fecha,
             estado,
             es_historico,
             perros_machos,
             perros_hembras,
             gatos_machos,
             gatos_hembras,
             perros_machos + perros_hembras AS total_perros,
             gatos_machos + gatos_hembras AS total_gatos,
             perros_machos + gatos_machos AS total_machos,
             perros_hembras + gatos_hembras AS total_hembras,
             perros_machos + perros_hembras + gatos_machos + gatos_hembras AS total_esterilizaciones
        FROM public.campanas c
       WHERE c.eliminado_en IS NULL
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.v_contador_esterilizaciones
        WITH (security_invoker = true) AS
      WITH t AS (
        SELECT COALESCE(sum(campanas.perros_machos), 0::bigint)::integer AS perros_machos,
               COALESCE(sum(campanas.perros_hembras), 0::bigint)::integer AS perros_hembras,
               COALESCE(sum(campanas.gatos_machos), 0::bigint)::integer AS gatos_machos,
               COALESCE(sum(campanas.gatos_hembras), 0::bigint)::integer AS gatos_hembras
          FROM public.campanas
         WHERE campanas.estado = 'cerrada' AND campanas.eliminado_en IS NULL
      )
      SELECT perros_machos,
             perros_hembras,
             gatos_machos,
             gatos_hembras,
             perros_machos + perros_hembras AS total_perros,
             gatos_machos + gatos_hembras AS total_gatos,
             perros_machos + perros_hembras + gatos_machos + gatos_hembras AS total,
             round(100.0 * perros_machos::numeric / NULLIF(perros_machos + perros_hembras, 0)::numeric, 1)::double precision AS pct_perros_machos,
             round(100.0 * perros_hembras::numeric / NULLIF(perros_machos + perros_hembras, 0)::numeric, 1)::double precision AS pct_perros_hembras,
             round(100.0 * gatos_machos::numeric / NULLIF(gatos_machos + gatos_hembras, 0)::numeric, 1)::double precision AS pct_gatos_machos,
             round(100.0 * gatos_hembras::numeric / NULLIF(gatos_machos + gatos_hembras, 0)::numeric, 1)::double precision AS pct_gatos_hembras
        FROM t
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.v_esterilizaciones_por_mes
        WITH (security_invoker = true) AS
      SELECT EXTRACT(year FROM fecha)::integer AS anio,
             EXTRACT(month FROM fecha)::integer AS mes,
             count(*)::integer AS jornadas,
             sum(perros_machos)::integer AS perros_machos,
             sum(perros_hembras)::integer AS perros_hembras,
             sum(gatos_machos)::integer AS gatos_machos,
             sum(gatos_hembras)::integer AS gatos_hembras,
             sum(perros_machos + perros_hembras + gatos_machos + gatos_hembras)::integer AS total
        FROM public.campanas
       WHERE estado = 'cerrada' AND NOT es_historico AND eliminado_en IS NULL
       GROUP BY (EXTRACT(year FROM fecha)::integer), (EXTRACT(month FROM fecha)::integer)
       ORDER BY (EXTRACT(year FROM fecha)::integer) DESC, (EXTRACT(month FROM fecha)::integer) DESC
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.v_campanas_resumen
        WITH (security_invoker = true) AS
      SELECT id,
             titulo_es,
             titulo_en,
             lugar,
             fecha,
             estado,
             es_historico,
             perros_machos,
             perros_hembras,
             gatos_machos,
             gatos_hembras,
             perros_machos + perros_hembras AS total_perros,
             gatos_machos + gatos_hembras AS total_gatos,
             perros_machos + gatos_machos AS total_machos,
             perros_hembras + gatos_hembras AS total_hembras,
             perros_machos + perros_hembras + gatos_machos + gatos_hembras AS total_esterilizaciones
        FROM public.campanas c
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.v_contador_esterilizaciones
        WITH (security_invoker = true) AS
      WITH t AS (
        SELECT COALESCE(sum(campanas.perros_machos), 0::bigint)::integer AS perros_machos,
               COALESCE(sum(campanas.perros_hembras), 0::bigint)::integer AS perros_hembras,
               COALESCE(sum(campanas.gatos_machos), 0::bigint)::integer AS gatos_machos,
               COALESCE(sum(campanas.gatos_hembras), 0::bigint)::integer AS gatos_hembras
          FROM public.campanas
         WHERE campanas.estado = 'cerrada'
      )
      SELECT perros_machos,
             perros_hembras,
             gatos_machos,
             gatos_hembras,
             perros_machos + perros_hembras AS total_perros,
             gatos_machos + gatos_hembras AS total_gatos,
             perros_machos + perros_hembras + gatos_machos + gatos_hembras AS total,
             round(100.0 * perros_machos::numeric / NULLIF(perros_machos + perros_hembras, 0)::numeric, 1)::double precision AS pct_perros_machos,
             round(100.0 * perros_hembras::numeric / NULLIF(perros_machos + perros_hembras, 0)::numeric, 1)::double precision AS pct_perros_hembras,
             round(100.0 * gatos_machos::numeric / NULLIF(gatos_machos + gatos_hembras, 0)::numeric, 1)::double precision AS pct_gatos_machos,
             round(100.0 * gatos_hembras::numeric / NULLIF(gatos_machos + gatos_hembras, 0)::numeric, 1)::double precision AS pct_gatos_hembras
        FROM t
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW public.v_esterilizaciones_por_mes
        WITH (security_invoker = true) AS
      SELECT EXTRACT(year FROM fecha)::integer AS anio,
             EXTRACT(month FROM fecha)::integer AS mes,
             count(*)::integer AS jornadas,
             sum(perros_machos)::integer AS perros_machos,
             sum(perros_hembras)::integer AS perros_hembras,
             sum(gatos_machos)::integer AS gatos_machos,
             sum(gatos_hembras)::integer AS gatos_hembras,
             sum(perros_machos + perros_hembras + gatos_machos + gatos_hembras)::integer AS total
        FROM public.campanas
       WHERE estado = 'cerrada' AND NOT es_historico
       GROUP BY (EXTRACT(year FROM fecha)::integer), (EXTRACT(month FROM fecha)::integer)
       ORDER BY (EXTRACT(year FROM fecha)::integer) DESC, (EXTRACT(month FROM fecha)::integer) DESC
    `);

    await queryRunner.query('DROP INDEX IF EXISTS public.ix_campanas_activas_fecha');
    await queryRunner.query(
      'ALTER TABLE public.campanas DROP CONSTRAINT IF EXISTS campanas_eliminado_por_fkey',
    );
    await queryRunner.query(`
      ALTER TABLE public.campanas
        DROP COLUMN IF EXISTS eliminado_por,
        DROP COLUMN IF EXISTS eliminado_en
    `);
  }
}
