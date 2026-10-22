const DEFAULT_PORT = 3000;
const FORBIDDEN_DATABASE_SSL_PARAMETERS = [
  'ssl',
  'sslmode',
  'sslrootcert',
  'sslcert',
  'sslkey',
] as const;

export function parseAllowedOrigins(value: unknown): string[] {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('CORS_ALLOWED_ORIGINS debe incluir al menos un origen');
  }

  const origins = [...new Set(value.split(',').map((origin) => origin.trim()))];

  for (const origin of origins) {
    if (origin === '*') {
      throw new Error('CORS_ALLOWED_ORIGINS no permite el origen comodín "*"');
    }

    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Origen CORS inválido: ${origin}`);
    }

    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.origin !== origin
    ) {
      throw new Error(`Origen CORS inválido: ${origin}`);
    }
  }

  return origins;
}

export function validateEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const parsedPort = Number(values.PORT ?? DEFAULT_PORT);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error('PORT debe ser un número entero entre 1 y 65535');
  }

  const allowedOrigins = parseAllowedOrigins(values.CORS_ALLOWED_ORIGINS);
  const databaseUrl = validateDatabaseUrl(values.DATABASE_URL);
  const certificatePath = validateOptionalString(
    values.DATABASE_CA_CERT_PATH,
    'DATABASE_CA_CERT_PATH',
  );

  return {
    ...values,
    PORT: parsedPort,
    CORS_ALLOWED_ORIGINS: allowedOrigins.join(','),
    DATABASE_URL: databaseUrl,
    ...(certificatePath ? { DATABASE_CA_CERT_PATH: certificatePath } : {}),
  };
}

function validateDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('DATABASE_URL es obligatoria');
  }

  const databaseUrl = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL debe ser una URI PostgreSQL válida');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL debe utilizar el protocolo PostgreSQL');
  }

  const conflictingParameter = FORBIDDEN_DATABASE_SSL_PARAMETERS.find(
    (parameter) => parsed.searchParams.has(parameter),
  );
  if (conflictingParameter) {
    throw new Error(
      `DATABASE_URL no debe incluir ${conflictingParameter}; TLS se configura mediante DATABASE_CA_CERT_PATH`,
    );
  }

  return databaseUrl;
}

function validateOptionalString(
  value: unknown,
  name: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} no puede estar vacía cuando está definida`);
  }

  return value.trim();
}
