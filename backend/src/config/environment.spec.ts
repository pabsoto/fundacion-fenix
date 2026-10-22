import { parseAllowedOrigins, validateEnvironment } from './environment.js';

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
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
        DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres',
      }),
    ).toMatchObject({ PORT: 3100 });
  });

  it('requires a PostgreSQL database URL', () => {
    expect(() =>
      validateEnvironment({
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
        DATABASE_URL: 'https://example.invalid/database',
      }),
    ).toThrow('DATABASE_URL debe utilizar el protocolo PostgreSQL');
  });

  it.each(['sslmode', 'sslrootcert', 'sslcert', 'sslkey'])(
    'rejects %s in DATABASE_URL so pg cannot override the verified TLS object',
    (parameter) => {
      expect(() =>
        validateEnvironment({
          CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
          DATABASE_URL: `postgresql://user:password@localhost:5432/postgres?${parameter}=value`,
        }),
      ).toThrow(`DATABASE_URL no debe incluir ${parameter}`);
    },
  );
});
