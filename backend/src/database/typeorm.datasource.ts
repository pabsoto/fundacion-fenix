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

const dataSource = new DataSource(createDatabaseOptions(process.env));

export default dataSource;
