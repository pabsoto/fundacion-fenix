import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    env: {
      CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres',
      AUTH_REDIRECT_URL: 'http://localhost:5173/admin',
      // Credenciales ficticias y aisladas: la integración continua nunca
      // contacta con Google. Los proveedores OIDC se sustituyen por dobles de
      // prueba en las pruebas E2E.
      GOOGLE_CLIENT_ID: '000000000000-ficticio.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'secreto-ficticio-para-pruebas',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
      GOOGLE_OAUTH_STATE_SECRET:
        'secreto-ficticio-para-firmar-cookies-de-prueba-1234567890',
    },
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
