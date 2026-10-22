import {
  ConfiguracionGoogleOAuthInvalidaError,
  hayConfiguracionGoogleOAuth,
  validarConfiguracionGoogleOAuth,
} from './google-oauth.js';
import {
  ConfiguracionSesionInvalidaError,
  validarConfiguracionSesion,
} from './sesion.js';
import { validateSupabaseStorageEnvironment } from './supabase-storage.js';

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
  const googleOAuth = validateGoogleOAuthEnvironment(values);
  const sesion = validateSessionEnvironment(values, allowedOrigins);
  const storage = validateSupabaseStorageEnvironment(values);

  return {
    ...values,
    PORT: parsedPort,
    CORS_ALLOWED_ORIGINS: allowedOrigins.join(','),
    DATABASE_URL: databaseUrl,
    ...(certificatePath ? { DATABASE_CA_CERT_PATH: certificatePath } : {}),
    ...googleOAuth,
    ...sesion,
    ...storage,
  };
}

/**
 * Valida la configuración de las sesiones administrativas.
 *
 * Una configuración insegura (cookie sin `Secure` en producción, `SameSite`
 * no permitido, redirección a un origen no autorizado) impide el arranque de
 * la aplicación: es preferible no arrancar que conceder acceso con cookies
 * debiles.
 */
function validateSessionEnvironment(
  values: Record<string, unknown>,
  allowedOrigins: string[],
): Record<string, unknown> {
  try {
    const configuracion = validarConfiguracionSesion(
      values as NodeJS.ProcessEnv,
      allowedOrigins,
    );

    return {
      AUTH_REDIRECT_URL: configuracion.redirectUrl,
      SESSION_COOKIE_NAME: configuracion.cookieName,
      SESSION_COOKIE_PATH: configuracion.cookiePath,
      SESSION_COOKIE_SAMESITE: configuracion.cookieSameSite,
      SESSION_COOKIE_SECURE: String(configuracion.cookieSecure),
      SESSION_IDLE_TIMEOUT_SECONDS: String(configuracion.idleTimeoutSegundos),
      SESSION_ABSOLUTE_TIMEOUT_SECONDS: String(
        configuracion.absoluteTimeoutSegundos,
      ),
      SESSION_ROTATION_INTERVAL_SECONDS: String(
        configuracion.rotationIntervalSegundos,
      ),
      ...(configuracion.cookieDomain
        ? { SESSION_COOKIE_DOMAIN: configuracion.cookieDomain }
        : {}),
    };
  } catch (error) {
    if (error instanceof ConfiguracionSesionInvalidaError) {
      throw new Error(error.message);
    }

    throw error;
  }
}

/**
 * Valida la configuración de Google OAuth/OIDC.
 *
 * - Si se declara alguna variable del flujo, todas las obligatorias deben estar
 *   presentes y ser válidas (se rechazan configuraciones parciales).
 * - Si no se declara ninguna variable, el flujo queda deshabilitado. En
 *   producción esto es un error: la aplicación no debe arrancar sin la
 *   autenticación administrativa configurada.
 */
function validateGoogleOAuthEnvironment(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const entorno = values as NodeJS.ProcessEnv;

  if (!hayConfiguracionGoogleOAuth(entorno)) {
    const nodeEnv =
      typeof values.NODE_ENV === 'string' ? values.NODE_ENV.trim() : '';

    if (nodeEnv === 'production') {
      throw new Error(
        'La autenticación con Google OAuth debe estar configurada en producción: define GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL y GOOGLE_OAUTH_STATE_SECRET',
      );
    }

    return {};
  }

  try {
    const configuracion = validarConfiguracionGoogleOAuth(entorno);

    return {
      GOOGLE_CLIENT_ID: configuracion.clientId,
      GOOGLE_CLIENT_SECRET: configuracion.clientSecret,
      GOOGLE_CALLBACK_URL: configuracion.callbackUrl,
      GOOGLE_OAUTH_STATE_SECRET: configuracion.stateSecret,
      GOOGLE_OAUTH_ISSUER: configuracion.issuer,
      GOOGLE_OAUTH_JWKS_URI: configuracion.jwksUri,
      GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS: String(configuracion.ttlSegundos),
    };
  } catch (error) {
    if (error instanceof ConfiguracionGoogleOAuthInvalidaError) {
      throw new Error(error.message);
    }

    throw error;
  }
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
