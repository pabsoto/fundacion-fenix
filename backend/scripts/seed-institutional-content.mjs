import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const backendRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(backendRoot, '..');

function readEnv() {
  return Object.fromEntries(
    fs.readFileSync(path.join(backendRoot, '.env'), 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const env = readEnv();
const entries = JSON.parse(
  fs.readFileSync(path.join(backendRoot, 'seeds', 'contenido-institucional.json'), 'utf8'),
);
const keys = entries.map((entry) => entry.clave);
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(env.DATABASE_CA_CERT_PATH, 'utf8'),
    rejectUnauthorized: true,
  },
  max: 1,
});

const client = await pool.connect();
try {
  await client.query('BEGIN');
  const previous = await client.query(
    `select clave, titulo_es, titulo_en, texto_es, texto_en, imagen_ruta, orden, visible,
            actualizado_por, creado_en, actualizado_en
       from public.contenido_institucional
      where clave = any($1::text[])
      order by clave`,
    [keys],
  );

  const manifestPath = path.join(
    repositoryRoot,
    'docs',
    'integracion-final',
    'contenido-institucional-manifest.json',
  );
  const existingManifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : null;
  const alreadyTracked = new Set(existingManifest?.keys ?? []);
  const manifest = {
    projectRef: new URL(env.SUPABASE_URL).hostname.split('.')[0],
    table: 'public.contenido_institucional',
    generatedAt: existingManifest?.generatedAt ?? new Date().toISOString(),
    keys,
    previousValues: {
      ...Object.fromEntries(
        (existingManifest?.keys ?? []).map((key) => [
          key,
          existingManifest?.previousValues?.[key] ?? null,
        ]),
      ),
      ...Object.fromEntries(
        previous.rows
          .filter((row) => !alreadyTracked.has(row.clave))
          .map((row) => [row.clave, row]),
      ),
      ...Object.fromEntries(
        keys.filter((key) => !alreadyTracked.has(key) && !previous.rows.some((row) => row.clave === key))
          .map((key) => [key, null]),
      ),
    },
  };
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  for (const entry of entries) {
    await client.query(
      `insert into public.contenido_institucional
        (clave, titulo_es, titulo_en, texto_es, texto_en, imagen_ruta, orden, visible)
       values ($1, $2, $3, $4, $5, null, $6, true)
       on conflict (clave) do update
         set titulo_es = excluded.titulo_es,
             titulo_en = excluded.titulo_en,
             texto_es = excluded.texto_es,
             texto_en = excluded.texto_en,
             orden = excluded.orden,
             visible = true,
             actualizado_en = now()
       where (contenido_institucional.titulo_es,
              contenido_institucional.titulo_en,
              contenido_institucional.texto_es,
              contenido_institucional.texto_en,
              contenido_institucional.orden,
              contenido_institucional.visible)
          is distinct from
             (excluded.titulo_es,
              excluded.titulo_en,
              excluded.texto_es,
              excluded.texto_en,
              excluded.orden,
              excluded.visible)`,
      [
        entry.clave,
        entry.tituloEs,
        entry.tituloEn,
        entry.textoEs,
        entry.textoEn,
        entry.orden,
      ],
    );
  }

  const verification = await client.query(
    `select clave, titulo_es, titulo_en, texto_es, texto_en, orden, visible
       from public.contenido_institucional
      where clave = any($1::text[])
      order by orden, clave`,
    [keys],
  );
  if (verification.rowCount !== entries.length) {
    throw new Error(
      `La verificación devolvió ${verification.rowCount} registros; se esperaban ${entries.length}`,
    );
  }

  await client.query('COMMIT');
  console.log(
    JSON.stringify(
      {
        insertedOrUpdated: verification.rowCount,
        keys: verification.rows.map((row) => row.clave),
        manifest: path.relative(repositoryRoot, manifestPath),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
