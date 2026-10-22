import { parseAllowedOrigins, validateEnvironment } from './environment.js';

const BASE = {
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres',
  AUTH_REDIRECT_URL: 'http://localhost:5173/admin',
};

describe('environment configuration', () => {
  it('normalizes an explicit list of allowed origins', () => {
    expect(
      parseAllowedOrigins(
        'http://localhost:5173, https://administracion.fenix.example',
      ),
    ).toEqual([
      'http://localhost:5173',
      'https://administracion.fenix.example',
    ]);
  });

  it('rejects wildcard CORS when credentials will be enabled', () => {
    expect(() => parseAllowedOrigins('*')).toThrow(
      'CORS_ALLOWED_ORIGINS no permite el origen comodín "*"',
    );
  });

  it('parses and validates the application port', () => {
    expect(
      validateEnvironment({
        PORT: '3100',
        ...BASE,
      }),
    ).toMatchObject({ PORT: 3100 });
  });

  it('requires a PostgreSQL database URL', () => {
    expect(() =>
      validateEnvironment({
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
        AUTH_REDIRECT_URL: 'http://localhost:5173/admin',
        DATABASE_URL: 'https://example.invalid/database',
      }),
    ).toThrow('DATABASE_URL debe utilizar el protocolo PostgreSQL');
  });

  it.each(['sslmode', 'sslrootcert', 'sslcert', 'sslkey'])(
    'rejects %s in DATABASE_URL so pg cannot override the verified TLS object',
    (parameter) => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          DATABASE_URL: `postgresql://user:password@localhost:5432/postgres?${parameter}=value`,
        }),
      ).toThrow(`DATABASE_URL no debe incluir ${parameter}`);
    },
  );

  describe('configuración de Google OAuth', () => {
    const base = BASE;

    const configuracionCompleta = {
      GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'secreto',
      GOOGLE_CALLBACK_URL:
        'https://api.fundacionfenix.org/api/auth/google/callback',
      GOOGLE_OAUTH_STATE_SECRET: 'secreto-de-prueba-con-32-caracteres-minimo',
    };

    it('acepta una configuración completa y aplica los valores por defecto', () => {
      const resultado = validateEnvironment({
        ...base,
        ...configuracionCompleta,
      });

      expect(resultado).toMatchObject({
        GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com',
        GOOGLE_CALLBACK_URL:
          'https://api.fundacionfenix.org/api/auth/google/callback',
        GOOGLE_OAUTH_ISSUER: 'https://accounts.google.com',
        GOOGLE_OAUTH_JWKS_URI: 'https://www.googleapis.com/oauth2/v3/certs',
        GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS: '600',
      });
    });

    it('rechaza una configuración parcial', () => {
      expect(() =>
        validateEnvironment({
          ...base,
          GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com',
        }),
      ).toThrow('GOOGLE_CLIENT_SECRET es obligatoria');
    });

    it('rechaza una URI de redirección que no sea una URL válida', () => {
      expect(() =>
        validateEnvironment({
          ...base,
          ...configuracionCompleta,
          GOOGLE_CALLBACK_URL: 'no-es-una-url',
        }),
      ).toThrow('GOOGLE_CALLBACK_URL debe ser una URL absoluta válida');
    });

    it('rechaza una URI de redirección que no utiliza https', () => {
      expect(() =>
        validateEnvironment({
          ...base,
          ...configuracionCompleta,
          GOOGLE_CALLBACK_URL:
            'http://api.fundacionfenix.org/api/auth/google/callback',
        }),
      ).toThrow('GOOGLE_CALLBACK_URL debe utilizar el protocolo https');
    });

    it('rechaza un secreto de estado demasiado corto', () => {
      expect(() =>
        validateEnvironment({
          ...base,
          ...configuracionCompleta,
          GOOGLE_OAUTH_STATE_SECRET: 'corto',
        }),
      ).toThrow('GOOGLE_OAUTH_STATE_SECRET debe tener al menos 32 caracteres');
    });

    it('rechaza una caducidad de transacción fuera de rango', () => {
      expect(() =>
        validateEnvironment({
          ...base,
          ...configuracionCompleta,
          GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS: '5',
        }),
      ).toThrow('GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS debe ser un entero');
    });

    it('permite omitir el flujo de Google fuera de producción', () => {
      expect(
        validateEnvironment({ ...base, NODE_ENV: 'test' }),
      ).not.toHaveProperty('GOOGLE_CLIENT_ID');
    });

    it('exige el flujo de Google en producción', () => {
      expect(() =>
        validateEnvironment({ ...base, NODE_ENV: 'production' }),
      ).toThrow(
        'La autenticación con Google OAuth debe estar configurada en producción',
      );
    });
  });

  describe('configuración de sesiones administrativas', () => {
    it('normaliza la configuración de sesión', () => {
      expect(validateEnvironment({ ...BASE })).toMatchObject({
        AUTH_REDIRECT_URL: 'http://localhost:5173/admin',
        SESSION_COOKIE_NAME: 'fenix_session',
        SESSION_COOKIE_PATH: '/api',
        SESSION_COOKIE_SAMESITE: 'lax',
        SESSION_IDLE_TIMEOUT_SECONDS: '1800',
        SESSION_ABSOLUTE_TIMEOUT_SECONDS: '43200',
        SESSION_ROTATION_INTERVAL_SECONDS: '300',
      });
    });

    it('exige la URL de redirección al frontend administrativo', () => {
      expect(() =>
        validateEnvironment({
          CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
          DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres',
        }),
      ).toThrow('AUTH_REDIRECT_URL es obligatoria');
    });

    it('exige que el origen de la redirección esté permitido por CORS', () => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          AUTH_REDIRECT_URL: 'https://sitio-no-autorizado.example/panel',
        }),
      ).toThrow('debe estar incluido en CORS_ALLOWED_ORIGINS');
    });

    it('rechaza una redirección que no utilize https fuera de localhost', () => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          AUTH_REDIRECT_URL: 'http://panel.fundacionfenix.org',
        }),
      ).toThrow('AUTH_REDIRECT_URL debe utilizar el protocolo https');
    });

    it('activa Secure en producción y lo rechaza si se desactiva', () => {
      const google = {
        GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'secreto',
        GOOGLE_CALLBACK_URL:
          'https://api.fundacionfenix.org/api/auth/google/callback',
        GOOGLE_OAUTH_STATE_SECRET: 'secreto-de-prueba-con-32-caracteres-minimo',
      };

      expect(
        validateEnvironment({ ...BASE, ...google, NODE_ENV: 'production' })
          .SESSION_COOKIE_SECURE,
      ).toBe('true');

      expect(() =>
        validateEnvironment({
          ...BASE,
          ...google,
          NODE_ENV: 'production',
          SESSION_COOKIE_SECURE: 'false',
        }),
      ).toThrow('SESSION_COOKIE_SECURE no puede desactivarse en producción');
    });

    it('permite desactivar Secure de forma explícita en desarrollo', () => {
      expect(
        validateEnvironment({
          ...BASE,
          NODE_ENV: 'development',
          SESSION_COOKIE_SECURE: 'false',
        }).SESSION_COOKIE_SECURE,
      ).toBe('false');
    });

    it('exige Secure cuando SameSite es None', () => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          SESSION_COOKIE_SAMESITE: 'none',
          SESSION_COOKIE_SECURE: 'false',
        }),
      ).toThrow(
        'SESSION_COOKIE_SAMESITE=none exige SESSION_COOKIE_SECURE=true',
      );
    });

    it('rechaza una caducidad absoluta menor que la de inactividad', () => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          SESSION_IDLE_TIMEOUT_SECONDS: '3600',
          SESSION_ABSOLUTE_TIMEOUT_SECONDS: '600',
        }),
      ).toThrow(
        'SESSION_ABSOLUTE_TIMEOUT_SECONDS no puede ser menor que SESSION_IDLE_TIMEOUT_SECONDS',
      );
    });

    it('rechaza un intervalo de renovación superior a la inactividad', () => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          SESSION_IDLE_TIMEOUT_SECONDS: '600',
          SESSION_ROTATION_INTERVAL_SECONDS: '3600',
        }),
      ).toThrow(
        'SESSION_ROTATION_INTERVAL_SECONDS no puede ser mayor que SESSION_IDLE_TIMEOUT_SECONDS',
      );
    });
  });

  describe('configuración de Supabase Storage', () => {
    it('acepta la configuración completa del bucket de donaciones', () => {
      expect(
        validateEnvironment({
          ...BASE,
          SUPABASE_URL: 'https://proyecto.supabase.co/',
          SUPABASE_SERVICE_ROLE_KEY:
            'service-role-ficticia-solo-para-pruebas-1234567890',
          SUPABASE_STORAGE_BUCKET: 'fenix-donaciones',
        }),
      ).toMatchObject({
        SUPABASE_URL: 'https://proyecto.supabase.co',
        SUPABASE_STORAGE_BUCKET: 'fenix-donaciones',
      });
    });

    it('rechaza configuraciones parciales y nombres de bucket inseguros', () => {
      expect(() =>
        validateEnvironment({
          ...BASE,
          SUPABASE_URL: 'https://proyecto.supabase.co',
        }),
      ).toThrow('SUPABASE_SERVICE_ROLE_KEY es obligatoria');

      expect(() =>
        validateEnvironment({
          ...BASE,
          SUPABASE_URL: 'https://proyecto.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY:
            'service-role-ficticia-solo-para-pruebas-1234567890',
          SUPABASE_STORAGE_BUCKET: '../bucket',
        }),
      ).toThrow('SUPABASE_STORAGE_BUCKET debe ser un nombre seguro');
    });
  });
});
