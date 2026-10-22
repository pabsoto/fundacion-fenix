import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    env: {
      CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres',
    },
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
