/**
 * Procedimiento oficial de aplicación de las migraciones de la base de datos.
 *
 * Es el **único** camino previsto para modificar el esquema: cualquier
 * cambio de esquema debe entrar como una migración versionada en
 * `src/database/migrations/` y aplicarse con este script (o con el CLI de
 * TypeORM sobre el mismo `DataSource`).
 *
 * El script es deliberadamente prudente:
 *
 * - **no escribe nada** salvo que se pase `--confirmar`;
 * - la simulación es estrictamente de sólo lectura: no crea la tabla de
 *   historial ni modifica nada;
 * - muestra siempre la base de datos de destino con la contraseña oculta;
 * - no modifica `synchronize` ni `migrationsRun`, que siguen en `false`: la
 *   aplicación nunca altera el esquema al arrancar;
 * - registra la migración aplicada en la tabla `migrations`, que es el
 *   historial que TypeORM usa para saber qué falta por ejecutar;
 * - **crea y protege `public.migrations` antes de aplicar las migraciones**:
 *   TypeORM la crearía por su cuenta, fuera de la transacción de la
 *   migración y sin protección, con lo que `anon` y `authenticated`
 *   heredarían acceso de escritura sobre el historial. Aquí nace ya
 *   protegida (RLS, sin políticas y sin privilegios para los roles públicos)
 *   y dentro de una única transacción, sin ventana de exposición;
 * - aborta si la tabla del historial no ha quedado protegida;
 * - es **idempotente**: si la migración ya está aplicada, no hace nada.
 *
 * Uso (desde `backend/`, con la compilación al día: `npm run build`):
 *
 *   npm run db:migrate                 # simulación: lista lo que se aplicaría
 *   npm run db:migrate -- --confirmar  # aplica las migraciones pendientes
 *
 * Si la migración se aplicó a mano con `sql/crear-sesiones-admin.sql` (editor
 * SQL de Supabase), hay que ejecutar después `npm run db:migrate -- --confirmar`
 * para que TypeORM registre la migración en su historial: el DDL es
 * idempotente (`IF NOT EXISTS`), de modo que la segunda ejecución no altera la
 * tabla.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DataSource, Migration } from 'typeorm';
import dataSource from '../database/typeorm.datasource.js';
import {
  asegurarTablaMigrations,
  leerEstadoProteccionMigrations,
} from '../database/proteger-migrations.js';

const ARGUMENTO_CONFIRMAR = '--confirmar';

/**
 * Vista mínima de las opciones de TypeORM que usa este script. Se evita
 * depender de la unión de tipos de todos los drivers soportados.
 */
interface OpcionesRelevantes {
  readonly url?: string;
  readonly schema?: string;
  readonly migrationsTableName?: string;
  readonly migrations?: readonly (Function | string)[];
  readonly synchronize?: boolean;
  readonly migrationsRun?: boolean;
}

function esClaseDeMigracion(valor: unknown): valor is Function {
  return (
    typeof valor === 'function' &&
    typeof (valor as { prototype?: { up?: unknown } }).prototype?.up ===
      'function'
  );
}

function ocultarSecreto(url: string | undefined): string {
  if (!url) {
    return '(sin DATABASE_URL)';
  }

  try {
    const parsed = new URL(url);

    if (parsed.password) {
      parsed.password = '********';
    }

    return parsed.toString();
  } catch {
    return '(URL no analizable)';
  }
}

/**
 * Extrae el directorio de un patrón glob de migraciones.
 *
 * `…/migrations/[0-9]*.js` → `…/migrations`
 */
function directorioDePatron(patron: string): string {
  const separador = patron.includes('\\') && !patron.includes('/') ? '\\' : '/';
  const segmentos = patron.split(/[\\/]/);
  const indice = segmentos.findIndex((segmento) => /[[*?{]/.test(segmento));
  const utiles = indice === -1 ? segmentos : segmentos.slice(0, indice);

  return utiles.join(separador);
}

/** Nombres de las migraciones disponibles en disco. */
async function migracionesEnDisco(
  opciones: OpcionesRelevantes,
): Promise<string[]> {
  const nombres: string[] = [];

  for (const opcion of opciones.migrations ?? []) {
    if (typeof opcion !== 'string') {
      nombres.push(opcion.name);
      continue;
    }

    const directorio = directorioDePatron(opcion);
    // Convención de TypeORM: `<marca de tiempo>-<Nombre>.js`. El mismo
    // criterio que usa el patrón de migraciones del `DataSource`.
    const archivos = readdirSync(directorio).filter((archivo) =>
      /^\d+.*\.js$/.test(archivo),
    );

    for (const archivo of archivos) {
      const modulo = (await import(
        pathToFileURL(join(directorio, archivo)).href
      )) as Record<string, unknown>;
      const clase = Object.values(modulo).find(esClaseDeMigracion);

      if (clase) {
        nombres.push(clase.name);
      }
    }
  }

  return nombres.sort();
}

/** Nombres de las migraciones ya registradas en el historial de TypeORM. */
async function migracionesAplicadas(
  origen: DataSource,
  opciones: OpcionesRelevantes,
): Promise<string[]> {
  const esquema = opciones.schema ?? 'public';
  const tabla = opciones.migrationsTableName ?? 'migrations';
  const qualified = `"${esquema}"."${tabla}"`;

  const existe = await origen.query(
    `SELECT to_regclass($1) IS NOT NULL AS existe`,
    [qualified],
  );

  if (!existe[0]?.existe) {
    return [];
  }

  const filas = await origen.query(`SELECT name FROM ${qualified} ORDER BY id`);

  return filas.map((fila: { name: string }) => fila.name);
}

async function main(): Promise<void> {
  const confirmar = process.argv.slice(2).includes(ARGUMENTO_CONFIRMAR);
  const opciones = dataSource.options as unknown as OpcionesRelevantes;

  console.log('Base de datos de destino:', ocultarSecreto(opciones.url));
  console.log(
    `Modo: ${confirmar ? 'APLICAR migraciones pendientes' : 'SIMULACIÓN (sólo lectura)'}`,
  );

  if (opciones.synchronize || opciones.migrationsRun) {
    throw new Error(
      'La configuración de TypeORM no debe tener synchronize ni migrationsRun activados',
    );
  }

  await dataSource.initialize();

  try {
    if (!confirmar) {
      const enDisco = await migracionesEnDisco(opciones);
      const aplicadas = await migracionesAplicadas(dataSource, opciones);
      const pendientes = enDisco.filter(
        (nombre) => !aplicadas.includes(nombre),
      );
      const historial = await leerEstadoProteccionMigrations(dataSource);

      console.log('');
      console.log('Migraciones pendientes (simulación):');

      if (pendientes.length === 0) {
        console.log('  (ninguna: el esquema está actualizado)');
      }

      for (const nombre of pendientes) {
        console.log(`  - ${nombre}`);
      }

      console.log('');
      console.log(
        `Historial de migraciones (public.migrations): ${
          historial.existe
            ? `existe, RLS=${historial.rlsActivo}, políticas=${historial.politicas}`
            : 'NO EXISTE (se creará protegida al aplicar)'
        }`,
      );

      console.log('');
      console.log(
        'Para aplicarlas de verdad: npm run db:migrate -- --confirmar',
      );

      return;
    }

    // El historial de migraciones se crea y se protege ANTES de ejecutar las
    // migraciones. TypeORM lo crearía por su cuenta, fuera de la transacción
    // de la migración y sin protección: con los permisos por defecto de
    // Supabase, `anon` y `authenticated` heredarían acceso de escritura.
    // Aquí nace ya protegida y dentro de una única transacción, de modo que
    // nunca es visible en un estado desprotegido.
    await asegurarTablaMigrations(dataSource);

    const proteccion = await leerEstadoProteccionMigrations(dataSource);

    console.log('');
    console.log(
      `public.migrations: RLS=${proteccion.rlsActivo}, políticas=${proteccion.politicas}, visitantes con lectura=${proteccion.visitantesConLectura}`,
    );

    if (!proteccion.rlsActivo || proteccion.visitantesConLectura) {
      throw new Error(
        'La tabla public.migrations no ha quedado protegida: abortando sin aplicar migraciones',
      );
    }

    const aplicadas = await dataSource.runMigrations({
      transaction: 'each',
    });

    console.log('');
    console.log('Migraciones aplicadas:');

    if (aplicadas.length === 0) {
      console.log('  (ninguna: el esquema ya estaba actualizado)');
    }

    for (const migracion of aplicadas as Migration[]) {
      console.log(`  - ${migracion.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

await main();
