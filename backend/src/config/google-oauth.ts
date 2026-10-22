/**
 * Configuración de la autenticación administrativa mediante Google OAuth 2.0 /
 * OpenID Connect.
 *
 * El backend actúa como cliente OIDC confidencial (aplicación web) y sólo
 * solicita los permisos `openid`, `email` y `profile`. No se solicitan
 * permisos de Gmail, Drive, Calendar ni acceso offline (`access_type=offline`).
 */

export const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'] as const;

export const GOOGLE_ISSUER_POR_DEFECTO = 'https://accounts.google.com';
export const GOOGLE_JWKS_URI_POR_DEFECTO =
  'https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_TTL_SEGUNDOS_POR_DEFECTO = 600;
export const GOOGLE_TTL_SEGUNDOS_MINIMO = 60;
export const GOOGLE_TTL_SEGUNDOS_MAXIMO = 900;
export const GOOGLE_STATE_SECRET_LONGITUD_MINIMA = 32;

export const VARIABLES_GOOGLE_OAUTH = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'GOOGLE_OAUTH_STATE_SECRET',
  'GOOGLE_OAUTH_ISSUER',
  'GOOGLE_OAUTH_JWKS_URI',
  'GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS',
] as const;

export interface ConfiguracionGoogleOAuth {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly callbackUrl: string;
  readonly issuer: string;
  readonly jwksUri: string;
  readonly stateSecret: string;
  readonly ttlSegundos: number;
  readonly scopes: readonly string[];
}

export class ConfiguracionGoogleOAuthInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfiguracionGoogleOAuthInvalidaError';
  }
}

/**
 * Indica si el entorno declara alguna variable del flujo de Google. Sirve para
 * detectar configuraciones parciales (por ejemplo, sólo `GOOGLE_CLIENT_ID`),
 * que deben rechazarse en lugar de degradar el flujo.
 */
export function hayConfiguracionGoogleOAuth(
  entorno: NodeJS.ProcessEnv,
): boolean {
  return VARIABLES_GOOGLE_OAUTH.some((variable) => {
    const valor = entorno[variable];
    return typeof valor === 'string' && valor.trim() !== '';
  });
}

export function validarConfiguracionGoogleOAuth(
  entorno: NodeJS.ProcessEnv,
): ConfiguracionGoogleOAuth {
  const clientId = leerObligatorio(entorno, 'GOOGLE_CLIENT_ID');
  const clientSecret = leerObligatorio(entorno, 'GOOGLE_CLIENT_SECRET');
  const callbackUrl = leerObligatorio(entorno, 'GOOGLE_CALLBACK_URL');
  const stateSecret = leerObligatorio(entorno, 'GOOGLE_OAUTH_STATE_SECRET');

  if (stateSecret.length < GOOGLE_STATE_SECRET_LONGITUD_MINIMA) {
    throw new ConfiguracionGoogleOAuthInvalidaError(
      `GOOGLE_OAUTH_STATE_SECRET debe tener al menos ${GOOGLE_STATE_SECRET_LONGITUD_MINIMA} caracteres`,
    );
  }

  const issuer = leerOpcional(
    entorno,
    'GOOGLE_OAUTH_ISSUER',
    GOOGLE_ISSUER_POR_DEFECTO,
  );
  const jwksUri = leerOpcional(
    entorno,
    'GOOGLE_OAUTH_JWKS_URI',
    GOOGLE_JWKS_URI_POR_DEFECTO,
  );

  validarUrl(callbackUrl, 'GOOGLE_CALLBACK_URL', { httpSoloLocalhost: true });
  validarUrl(issuer, 'GOOGLE_OAUTH_ISSUER');
  validarUrl(jwksUri, 'GOOGLE_OAUTH_JWKS_URI');

  const ttlSegundos = leerTtl(entorno);

  return {
    clientId,
    clientSecret,
    callbackUrl,
    issuer,
    jwksUri,
    stateSecret,
    ttlSegundos,
    scopes: GOOGLE_OAUTH_SCOPES,
  };
}

function leerObligatorio(entorno: NodeJS.ProcessEnv, variable: string): string {
  const valor = entorno[variable];
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ConfiguracionGoogleOAuthInvalidaError(
      `${variable} es obligatoria para la autenticación con Google`,
    );
  }

  return valor.trim();
}

function leerOpcional(
  entorno: NodeJS.ProcessEnv,
  variable: string,
  valorPorDefecto: string,
): string {
  const valor = entorno[variable];
  if (valor === undefined || valor.trim() === '') {
    return valorPorDefecto;
  }

  return valor.trim();
}

function leerTtl(entorno: NodeJS.ProcessEnv): number {
  const valor = entorno.GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS;
  if (valor === undefined || valor.trim() === '') {
    return GOOGLE_TTL_SEGUNDOS_POR_DEFECTO;
  }

  const ttl = Number(valor.trim());
  if (
    !Number.isInteger(ttl) ||
    ttl < GOOGLE_TTL_SEGUNDOS_MINIMO ||
    ttl > GOOGLE_TTL_SEGUNDOS_MAXIMO
  ) {
    throw new ConfiguracionGoogleOAuthInvalidaError(
      `GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS debe ser un entero entre ${GOOGLE_TTL_SEGUNDOS_MINIMO} y ${GOOGLE_TTL_SEGUNDOS_MAXIMO}`,
    );
  }

  return ttl;
}

function validarUrl(
  valor: string,
  variable: string,
  opciones: { httpSoloLocalhost?: boolean } = {},
): void {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new ConfiguracionGoogleOAuthInvalidaError(
      `${variable} debe ser una URL absoluta válida`,
    );
  }

  if (url.protocol === 'http:') {
    const esLocalhost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1';
    if (!opciones.httpSoloLocalhost || !esLocalhost) {
      throw new ConfiguracionGoogleOAuthInvalidaError(
        `${variable} debe utilizar el protocolo https`,
      );
    }
  } else if (url.protocol !== 'https:') {
    throw new ConfiguracionGoogleOAuthInvalidaError(
      `${variable} debe utilizar el protocolo http o https`,
    );
  }
}
