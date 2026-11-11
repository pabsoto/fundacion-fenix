import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema base de FÉNIX: las tablas, funciones, disparadores y vistas que
 * existían en la base de datos antes de que las migraciones se versionaran.
 *
 * Se escribió a partir del catálogo real de PostgreSQL (tablas, restricciones,
 * índices, disparadores y definiciones de vistas), de modo que:
 *
 * - en una base **vacía** crea todo lo que las migraciones posteriores
 *   (`1730…`, `1731…`, `1732…`) dan por existente (`administradores`,
 *   `campanas`…);
 * - en la base **actual** no cambia nada: las tablas y los índices usan
 *   `IF NOT EXISTS`, los disparadores se crean solo si faltan y las funciones
 *   y vistas se redefinen con su misma definición.
 *
 * Tiene fecha anterior a las demás migraciones para ejecutarse primero.
 * No crea `sesiones_admin`, `animales` ni `fotos_campana` (migraciones
 * propias) ni `public.migrations` (la crea `db:migrate`).
 */
export class CrearEsquemaBase1729000000000 implements MigrationInterface {
  name = 'CrearEsquemaBase1729000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------
    // Tablas
    // ---------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.administradores (
        id             uuid        NOT NULL DEFAULT gen_random_uuid(),
        email          text        NOT NULL,
        nombre         text        NOT NULL,
        google_sub     text,
        activo         boolean     NOT NULL DEFAULT true,
        ultimo_acceso  timestamptz,
        creado_en      timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT administradores_pkey PRIMARY KEY (id),
        CONSTRAINT administradores_email_key UNIQUE (email),
        CONSTRAINT administradores_google_sub_key UNIQUE (google_sub),
        CONSTRAINT ck_administradores_email_minuscula CHECK (email = lower(email)),
        CONSTRAINT ck_administradores_nombre_no_vacio CHECK (length(btrim(nombre)) > 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.auditoria (
        id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
        administrador_id   uuid,
        tabla              text        NOT NULL,
        registro_id        uuid,
        accion             text        NOT NULL,
        campos_modificados text[],
        datos_antes        jsonb,
        datos_despues      jsonb,
        creado_en          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT auditoria_pkey PRIMARY KEY (id),
        CONSTRAINT auditoria_administrador_id_fkey FOREIGN KEY (administrador_id)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT ck_auditoria_accion CHECK (accion = ANY (ARRAY['INSERT', 'UPDATE', 'DELETE']))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.campanas (
        id               uuid        NOT NULL DEFAULT gen_random_uuid(),
        titulo_es        text        NOT NULL,
        titulo_en        text,
        descripcion_es   text,
        descripcion_en   text,
        lugar            text,
        fecha            date,
        estado           text        NOT NULL DEFAULT 'borrador',
        perros_machos    integer     NOT NULL DEFAULT 0,
        perros_hembras   integer     NOT NULL DEFAULT 0,
        gatos_machos     integer     NOT NULL DEFAULT 0,
        gatos_hembras    integer     NOT NULL DEFAULT 0,
        es_historico     boolean     NOT NULL DEFAULT false,
        creado_por       uuid,
        actualizado_por  uuid,
        creado_en        timestamptz NOT NULL DEFAULT now(),
        actualizado_en   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT campanas_pkey PRIMARY KEY (id),
        CONSTRAINT campanas_creado_por_fkey FOREIGN KEY (creado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT campanas_actualizado_por_fkey FOREIGN KEY (actualizado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT ck_campanas_titulo_no_vacio CHECK (length(btrim(titulo_es)) > 0),
        CONSTRAINT ck_campanas_estado CHECK (
          estado = ANY (ARRAY['borrador', 'publicada', 'cerrada'])
        ),
        CONSTRAINT ck_campanas_cantidades_no_negativas CHECK (
          perros_machos >= 0 AND perros_hembras >= 0
          AND gatos_machos >= 0 AND gatos_hembras >= 0
        ),
        CONSTRAINT ck_campanas_cerrada_con_numeros CHECK (
          estado <> 'cerrada'
          OR (perros_machos + perros_hembras + gatos_machos + gatos_hembras) > 0
        ),
        CONSTRAINT ck_campanas_historico_siempre_cerrado CHECK (
          NOT es_historico OR estado = 'cerrada'
        ),
        CONSTRAINT ck_campanas_lugar_y_fecha_al_publicar CHECK (
          estado = 'borrador'
          OR es_historico
          OR (fecha IS NOT NULL AND lugar IS NOT NULL AND length(btrim(lugar)) > 0)
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.campana_fotos (
        id           uuid        NOT NULL DEFAULT gen_random_uuid(),
        campana_id   uuid        NOT NULL,
        ruta_archivo text        NOT NULL,
        pie_es       text,
        pie_en       text,
        orden        integer     NOT NULL DEFAULT 0,
        creado_en    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT campana_fotos_pkey PRIMARY KEY (id),
        CONSTRAINT campana_fotos_campana_id_fkey FOREIGN KEY (campana_id)
          REFERENCES public.campanas (id) ON DELETE CASCADE,
        CONSTRAINT ck_campana_fotos_orden CHECK (orden >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.canales_contacto (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        tipo            text        NOT NULL,
        url             text        NOT NULL,
        texto_es        text,
        texto_en        text,
        orden           integer     NOT NULL DEFAULT 0,
        activo          boolean     NOT NULL DEFAULT true,
        actualizado_por uuid,
        creado_en       timestamptz NOT NULL DEFAULT now(),
        actualizado_en  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT canales_contacto_pkey PRIMARY KEY (id),
        CONSTRAINT canales_contacto_tipo_key UNIQUE (tipo),
        CONSTRAINT canales_contacto_actualizado_por_fkey FOREIGN KEY (actualizado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT ck_canales_tipo CHECK (
          tipo = ANY (ARRAY['whatsapp', 'facebook', 'instagram', 'tiktok', 'email'])
        ),
        CONSTRAINT ck_canales_url_segura CHECK (url ~* '^(https?://|mailto:)')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.contenido_institucional (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        clave           text        NOT NULL,
        titulo_es       text,
        titulo_en       text,
        texto_es        text,
        texto_en        text,
        imagen_ruta     text,
        orden           integer     NOT NULL DEFAULT 0,
        visible         boolean     NOT NULL DEFAULT true,
        actualizado_por uuid,
        creado_en       timestamptz NOT NULL DEFAULT now(),
        actualizado_en  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT contenido_institucional_pkey PRIMARY KEY (id),
        CONSTRAINT contenido_institucional_clave_key UNIQUE (clave),
        CONSTRAINT contenido_institucional_actualizado_por_fkey FOREIGN KEY (actualizado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT ck_contenido_clave_formato CHECK (clave ~ '^[a-z0-9_]+$')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.datos_donacion (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        titular         text        NOT NULL,
        banco           text        NOT NULL,
        telefono        text        NOT NULL,
        referencia      text        NOT NULL,
        numero_cuenta   text,
        qr_ruta         text,
        qr_vence_el     date,
        aviso_es        text,
        aviso_en        text,
        activo          boolean     NOT NULL DEFAULT false,
        creado_por      uuid,
        actualizado_por uuid,
        creado_en       timestamptz NOT NULL DEFAULT now(),
        actualizado_en  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT datos_donacion_pkey PRIMARY KEY (id),
        CONSTRAINT datos_donacion_creado_por_fkey FOREIGN KEY (creado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT,
        CONSTRAINT datos_donacion_actualizado_por_fkey FOREIGN KEY (actualizado_por)
          REFERENCES public.administradores (id) ON DELETE RESTRICT
      )
    `);

    // ---------------------------------------------------------------
    // Índices
    // ---------------------------------------------------------------
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_auditoria_creado_en
        ON public.auditoria (creado_en DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_auditoria_tabla_registro
        ON public.auditoria (tabla, registro_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campanas_estado_fecha
        ON public.campanas (estado, fecha DESC)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_campanas_un_solo_historico
        ON public.campanas ((true)) WHERE es_historico
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_campana_fotos_campana
        ON public.campana_fotos (campana_id, orden)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_datos_donacion_un_solo_activo
        ON public.datos_donacion ((true)) WHERE activo
    `);

    // ---------------------------------------------------------------
    // Funciones
    // ---------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.fn_actualizar_actualizado_en()
       RETURNS trigger
       LANGUAGE plpgsql
       SET search_path TO 'public'
      AS $fn$
      BEGIN
        NEW.actualizado_en := now();
        RETURN NEW;
      END;
      $fn$
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.fn_bloquear_borrado_campana_cerrada()
       RETURNS trigger
       LANGUAGE plpgsql
       SET search_path TO 'public'
      AS $fn$
      BEGIN
        IF OLD.estado = 'cerrada' THEN
          RAISE EXCEPTION 'No se puede borrar una campaña cerrada porque ya cuenta en el contador. Reábrela primero si realmente hay que eliminarla.'
            USING ERRCODE = 'restrict_violation';
        END IF;
        RETURN OLD;
      END;
      $fn$
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.fn_registrar_auditoria()
       RETURNS trigger
       LANGUAGE plpgsql
       SET search_path TO 'public'
      AS $fn$
      DECLARE
        v_modo        text  := COALESCE(TG_ARGV[0], 'completo');
        v_antes       jsonb;
        v_despues     jsonb;
        v_campos      text[];
        v_registro_id uuid;
        v_admin       uuid;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          v_despues     := to_jsonb(NEW);
          v_registro_id := (v_despues ->> 'id')::uuid;
          SELECT array_agg(k ORDER BY k) INTO v_campos FROM jsonb_object_keys(v_despues) AS k;

        ELSIF TG_OP = 'UPDATE' THEN
          v_antes       := to_jsonb(OLD);
          v_despues     := to_jsonb(NEW);
          v_registro_id := (v_despues ->> 'id')::uuid;
          -- Campos que realmente cambiaron (ignoramos los que cambian solos).
          SELECT array_agg(n.key ORDER BY n.key) INTO v_campos
            FROM jsonb_each(v_despues) AS n
           WHERE n.key NOT IN ('actualizado_en', 'ultimo_acceso')
             AND (v_antes -> n.key) IS DISTINCT FROM n.value;
          IF v_campos IS NULL THEN
            RETURN NULL;   -- no cambió nada relevante: no se registra
          END IF;

        ELSE  -- DELETE
          v_antes       := to_jsonb(OLD);
          v_registro_id := (v_antes ->> 'id')::uuid;
          SELECT array_agg(k ORDER BY k) INTO v_campos FROM jsonb_object_keys(v_antes) AS k;
        END IF;

        -- ¿Qué administrador? (primero lo que informe el backend; si no, la fila)
        BEGIN
          v_admin := NULLIF(current_setting('app.admin_id', true), '')::uuid;
        EXCEPTION WHEN others THEN
          v_admin := NULL;
        END;
        IF v_admin IS NULL THEN
          BEGIN
            v_admin := NULLIF(COALESCE(
                         v_despues ->> 'actualizado_por', v_despues ->> 'registrado_por', v_despues ->> 'creado_por',
                         v_antes   ->> 'actualizado_por', v_antes   ->> 'registrado_por', v_antes   ->> 'creado_por'
                       ), '')::uuid;
          EXCEPTION WHEN others THEN
            v_admin := NULL;
          END;
        END IF;

        INSERT INTO auditoria (administrador_id, tabla, registro_id, accion, campos_modificados, datos_antes, datos_despues)
        VALUES (
          v_admin, TG_TABLE_NAME, v_registro_id, TG_OP, v_campos,
          CASE WHEN v_modo = 'completo' THEN v_antes   END,
          CASE WHEN v_modo = 'completo' THEN v_despues END
        );

        RETURN NULL;  -- en triggers AFTER el valor de retorno se ignora
      END;
      $fn$
    `);

    // ---------------------------------------------------------------
    // Disparadores (se crean solo si faltan)
    // ---------------------------------------------------------------
    const disparadores: ReadonlyArray<readonly [string, string, string]> = [
      [
        'administradores',
        'trg_administradores_actualizado_en',
        'BEFORE UPDATE ON public.administradores FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_actualizado_en()',
      ],
      [
        'administradores',
        'trg_administradores_auditoria',
        "AFTER INSERT OR DELETE OR UPDATE ON public.administradores FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria('completo')",
      ],
      [
        'campanas',
        'trg_campanas_actualizado_en',
        'BEFORE UPDATE ON public.campanas FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_actualizado_en()',
      ],
      [
        'campanas',
        'trg_campanas_auditoria',
        "AFTER INSERT OR DELETE OR UPDATE ON public.campanas FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria('completo')",
      ],
      [
        'campanas',
        'trg_campanas_no_borrar_cerradas',
        'BEFORE DELETE ON public.campanas FOR EACH ROW EXECUTE FUNCTION public.fn_bloquear_borrado_campana_cerrada()',
      ],
      [
        'canales_contacto',
        'trg_canales_contacto_actualizado_en',
        'BEFORE UPDATE ON public.canales_contacto FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_actualizado_en()',
      ],
      [
        'canales_contacto',
        'trg_canales_contacto_auditoria',
        "AFTER INSERT OR DELETE OR UPDATE ON public.canales_contacto FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria('completo')",
      ],
      [
        'contenido_institucional',
        'trg_contenido_institucional_actualizado_en',
        'BEFORE UPDATE ON public.contenido_institucional FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_actualizado_en()',
      ],
      [
        'datos_donacion',
        'trg_datos_donacion_actualizado_en',
        'BEFORE UPDATE ON public.datos_donacion FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_actualizado_en()',
      ],
      [
        'datos_donacion',
        'trg_datos_donacion_auditoria',
        "AFTER INSERT OR DELETE OR UPDATE ON public.datos_donacion FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria('completo')",
      ],
    ];

    for (const [tabla, nombre, definicion] of disparadores) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
             WHERE tgname = '${nombre}'
               AND tgrelid = 'public.${tabla}'::regclass
          ) THEN
            EXECUTE 'CREATE TRIGGER ${nombre} ${definicion.replace(/'/g, "''")}';
          END IF;
        END
        $$
      `);
    }

    // ---------------------------------------------------------------
    // Vistas (security_invoker: respetan los permisos de quien consulta)
    // ---------------------------------------------------------------
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

    // ---------------------------------------------------------------
    // Seguridad: RLS sin políticas y sin acceso para los roles públicos.
    // En la base actual estas sentencias no cambian nada (ya es así).
    // ---------------------------------------------------------------
    const protegidas = [
      'administradores',
      'auditoria',
      'campanas',
      'campana_fotos',
      'canales_contacto',
      'contenido_institucional',
      'datos_donacion',
    ];
    const vistas = [
      'v_campanas_resumen',
      'v_contador_esterilizaciones',
      'v_esterilizaciones_por_mes',
    ];

    for (const tabla of protegidas) {
      await queryRunner.query(
        `ALTER TABLE public.${tabla} ENABLE ROW LEVEL SECURITY`,
      );
    }

    for (const objeto of [...protegidas, ...vistas]) {
      await queryRunner.query(`REVOKE ALL ON public.${objeto} FROM PUBLIC`);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            EXECUTE 'REVOKE ALL ON public.${objeto} FROM anon';
          END IF;

          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            EXECUTE 'REVOKE ALL ON public.${objeto} FROM authenticated';
          END IF;
        END
        $$
      `);
    }
  }

  /**
   * Esta migración describe lo que ya existía: revertirla no debe borrar
   * tablas con datos reales. Si hace falta, se limpia a mano.
   */
  public async down(): Promise<void> {
    // Intencionalmente vacío.
  }
}
