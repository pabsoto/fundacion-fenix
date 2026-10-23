import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const backendRoot = path.resolve(import.meta.dirname, '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(backendRoot, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(env.DATABASE_CA_CERT_PATH, 'utf8'),
    rejectUnauthorized: true,
  },
  max: 1,
});

try {
  const result = await pool.query(
    `select d.id, d.activo, d.qr_ruta, d.qr_vence_el,
            a.accion, a.campos_modificados, a.creado_en,
            a.datos_antes ->> 'qr_ruta' as qr_antes,
            a.datos_despues ->> 'qr_ruta' as qr_despues
       from public.datos_donacion d
       left join lateral (
         select accion, campos_modificados, creado_en, datos_antes, datos_despues
           from public.auditoria
          where tabla = 'datos_donacion' and registro_id = d.id
          order by creado_en desc
          limit 5
       ) a on true
      order by d.actualizado_en desc, a.creado_en desc nulls last
      limit 5`,
  );
  console.log(JSON.stringify(result.rows, null, 2));
} finally {
  await pool.end();
}
