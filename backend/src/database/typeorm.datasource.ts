import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database-options.js';

try {
  process.loadEnvFile();
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== 'ENOENT') {
    throw error;
  }
}

/**
 * DataSource preparado para las migraciones de TypeORM.
 *
 * El patrón `[0-9]*.js` sigue la convención de TypeORM (`<marca de tiempo>-<Nombre>.js`)
 * y evita que se interpreten como migraciones otros módulos que convivan en la
 * carpeta `migrations/`.
 *
 * `migrationsRun` permanece en `false`: las migraciones se ejecutan de forma
 * explícita y controlada, nunca de forma automática al arrancar.
 */
const dataSource = new DataSource({
  ...createDatabaseOptions(process.env),
  migrations: [join(import.meta.dirname, 'migrations', '[0-9]*.js')],
});

export default dataSource;
