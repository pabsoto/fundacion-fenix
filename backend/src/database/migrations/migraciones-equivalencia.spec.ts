import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SQL_PROTEGER_MIGRATIONS } from '../proteger-migrations.js';

const RUTA_MIGRACION = fileURLToPath(
  new URL('./1730000000000-CrearTablaSesionesAdmin.ts', import.meta.url),
);
const RUTA_SQL_SESIONES = fileURLToPath(
  new URL('../../../sql/crear-sesiones-admin.sql', import.meta.url),
);
const RUTA_SQL_HISTORIAL = fileURLToPath(
  new URL('../../../sql/proteger-migrations.sql', import.meta.url),
);

/** Normaliza una sentencia SQL para compararla sin diferencias de estilo. */
function normalizar(sentencia: string): string {
  return sentencia
    .replace(/--[^\n]*/g, ' ')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .replace(/;\s*$/, '')
    .trim()
    .toLowerCase();
}

/**
 * Divide un texto SQL en sentencias respetando los bloques delimitados por
 * `$$` (los bloques PL/pgSQL contienen `;` internos que no son separadores).
 */
function dividirSentencias(texto: string): string[] {
  const sentencias: string[] = [];
  let actual = '';
  let indice = 0;

  while (indice < texto.length) {
    if (texto.startsWith('$$', indice)) {
      const fin = texto.indexOf('$$', indice + 2);

      actual += texto.slice(indice, fin + 2);
      indice = fin + 2;
      continue;
    }

    if (texto[indice] === ';') {
      sentencias.push(actual);
      actual = '';
      indice += 1;
      continue;
    }

    actual += texto[indice];
    indice += 1;
  }

  if (actual.trim() !== '') {
    sentencias.push(actual);
  }

  return sentencias.map((sentencia) => sentencia.trim()).filter(Boolean);
}

/** Sentencias ejecutadas por `up()` en la migración TypeORM. */
function sentenciasDeMigracion(): string[] {
  const codigo = readFileSync(RUTA_MIGRACION, 'utf8');
  const inicio = codigo.indexOf('public async up(');
  const fin = codigo.indexOf('public async down(');

  expect(inicio).toBeGreaterThan(-1);
  expect(fin).toBeGreaterThan(inicio);

  const patron = /queryRunner\.query\(\s*`([\s\S]*?)`\s*\)/g;
  const sentencias: string[] = [];

  for (const coincidencia of codigo.slice(inicio, fin).matchAll(patron)) {
    sentencias.push(coincidencia[1]);
  }

  return sentencias;
}

/** Sentencias de un archivo SQL, sin comentarios ni BEGIN/COMMIT. */
function sentenciasDeSql(ruta: string): string[] {
  const codigo = readFileSync(ruta, 'utf8');
  const sinComentarios = codigo
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n');

  return dividirSentencias(sinComentarios).filter(
    (sentencia) => !/^begin$/i.test(sentencia) && !/^commit$/i.test(sentencia),
  );
}

describe('migración de sesiones administrativas', () => {
  it('la versión SQL es el espejo exacto de la migración TypeORM', () => {
    const desdeMigracion = sentenciasDeMigracion().map(normalizar);
    const desdeSql = sentenciasDeSql(RUTA_SQL_SESIONES).map(normalizar);

    expect(desdeMigracion.length).toBeGreaterThan(0);
    expect(desdeSql).toEqual(desdeMigracion);
  });

  it('activa Row Level Security y no crea ninguna política', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');

    expect(codigo).toContain(
      'ALTER TABLE public.sesiones_admin ENABLE ROW LEVEL SECURITY',
    );
    expect(codigo).not.toMatch(/CREATE\s+POLICY/i);
  });

  it('revoca el acceso a PUBLIC, anon, authenticated y service_role', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');

    expect(codigo).toContain(
      'REVOKE ALL ON TABLE public.sesiones_admin FROM PUBLIC',
    );
    expect(codigo).toContain(
      'REVOKE ALL ON TABLE public.sesiones_admin FROM anon',
    );
    expect(codigo).toContain(
      'REVOKE ALL ON TABLE public.sesiones_admin FROM authenticated',
    );
    expect(codigo).toContain(
      'REVOKE ALL ON TABLE public.sesiones_admin FROM service_role',
    );
  });

  it('concede escritura al backend y a nadie más', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');

    expect(codigo).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sesiones_admin TO %I',
    );
    expect(codigo).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sesiones_admin TO postgres',
    );
    expect(codigo).not.toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sesiones_admin TO service_role',
    );
  });

  it('no modifica ni elimina ninguna tabla existente', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');
    const cuerpoUp = codigo.slice(
      codigo.indexOf('public async up('),
      codigo.indexOf('public async down('),
    );

    expect(cuerpoUp).not.toMatch(/ALTER\s+TABLE\s+public\.administradores/i);
    expect(cuerpoUp).not.toMatch(/DROP\s+TABLE/i);
    expect(cuerpoUp).not.toMatch(/DROP\s+COLUMN/i);
    expect(cuerpoUp).not.toMatch(/ALTER\s+COLUMN/i);
    expect(cuerpoUp).not.toMatch(/TRUNCATE/i);
    expect(cuerpoUp).not.toMatch(/DELETE\s+FROM/i);
    expect(cuerpoUp).not.toMatch(/UPDATE\s+public\./i);
  });

  it('sólo elimina la tabla de sesiones en la reversión', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');
    const cuerpoDown = codigo.slice(codigo.indexOf('public async down('));

    expect(cuerpoDown).toContain('DROP TABLE IF EXISTS public.sesiones_admin');
    expect(cuerpoDown).not.toMatch(/administradores/i);
    expect(cuerpoDown).not.toMatch(/DROP\s+SCHEMA/i);
  });

  it('declara la clave foránea con borrado en cascada hacia administradores', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');

    expect(codigo).toContain('FOREIGN KEY (administrador_id)');
    expect(codigo).toContain('REFERENCES public.administradores (id)');
    expect(codigo).toContain('ON DELETE CASCADE');
  });

  it('crea los índices necesarios para consultar, renovar y revocar', () => {
    const codigo = readFileSync(RUTA_MIGRACION, 'utf8');

    expect(codigo).toContain(
      'CREATE INDEX IF NOT EXISTS ix_sesiones_admin_administrador_id',
    );
    expect(codigo).toContain(
      'CREATE INDEX IF NOT EXISTS ix_sesiones_admin_expira_en',
    );
    expect(codigo).toContain(
      'CONSTRAINT sesiones_admin_token_hash_key UNIQUE (token_hash)',
    );
  });
});

describe('protección del historial de migraciones', () => {
  it('la versión SQL es el espejo exacto del módulo TypeORM', () => {
    const desdeModulo = SQL_PROTEGER_MIGRATIONS.map(normalizar);
    const desdeSql = sentenciasDeSql(RUTA_SQL_HISTORIAL).map(normalizar);

    expect(desdeModulo.length).toBeGreaterThan(0);
    expect(desdeSql).toEqual(desdeModulo);
  });

  it('crea la tabla con el esquema exacto que espera TypeORM', () => {
    const sql = SQL_PROTEGER_MIGRATIONS.join('\n');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.migrations');
    expect(sql).toContain('id        SERIAL  NOT NULL');
    expect(sql).toContain('timestamp bigint  NOT NULL');
    expect(sql).toContain('name      varchar NOT NULL');
    expect(sql).toContain(
      'CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")',
    );
  });

  it('activa Row Level Security y no crea ninguna política', () => {
    const sql = SQL_PROTEGER_MIGRATIONS.join('\n');

    expect(sql).toContain(
      'ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY',
    );
    expect(sql).not.toMatch(/CREATE\s+POLICY/i);
  });

  it('revoca el acceso a PUBLIC, anon, authenticated y service_role', () => {
    const sql = SQL_PROTEGER_MIGRATIONS.join('\n');

    expect(sql).toContain('REVOKE ALL ON TABLE public.migrations FROM PUBLIC');
    expect(sql).toContain('REVOKE ALL ON TABLE public.migrations FROM anon');
    expect(sql).toContain(
      'REVOKE ALL ON TABLE public.migrations FROM authenticated',
    );
    expect(sql).toContain(
      'REVOKE ALL ON TABLE public.migrations FROM service_role',
    );
  });

  it('protege también la secuencia asociada', () => {
    const sql = SQL_PROTEGER_MIGRATIONS.join('\n');

    expect(sql).toContain(
      'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM PUBLIC',
    );
    expect(sql).toContain(
      'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM anon',
    );
    expect(sql).toContain(
      'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM authenticated',
    );
    expect(sql).toContain(
      'REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM service_role',
    );
  });

  it('conserva los privilegios del rol que ejecuta las migraciones', () => {
    const sql = SQL_PROTEGER_MIGRATIONS.join('\n');

    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.migrations TO %I',
    );
    expect(sql).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.migrations TO postgres',
    );
    expect(sql).toContain(
      'GRANT USAGE, SELECT ON SEQUENCE public.migrations_id_seq TO %I',
    );
    expect(sql).not.toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.migrations TO service_role',
    );
  });

  it('no altera los privilegios por defecto globales', () => {
    const sql = SQL_PROTEGER_MIGRATIONS.join('\n');

    expect(sql).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
  });
});
