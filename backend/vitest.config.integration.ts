import { defineConfig } from 'vitest/config';

/**
 * Pruebas de integración contra una instancia PostgreSQL aislada.
 *
 * No se ejecutan contra Supabase ni contra ninguna base de datos de
 * producción. Para lanzarlas hay que definir `TEST_DATABASE_URL` (y, si el
 * servidor exige TLS, `TEST_DATABASE_CA_CERT_PATH`).
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.integration-spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
