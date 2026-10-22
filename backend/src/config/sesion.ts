/**
 * Configuración de las sesiones administrativas de la Fundación FÉNIX LPB.
 *
 * La sesión es un artefacto del servidor: el navegador sólo recibe un
 * identificador opaco en una cookie `HttpOnly`. Este módulo centraliza la
 * validación de las variables de entorno que la gobiernan, de modo que una
 * configuración insegura (por ejemplo, `Secure` desactivado en producción o
 * `SameSite=None` sin HTTPS) impida el arranque de la aplicación.
 *
 * Variables administradas:
 *
 * - `AUTH_REDIRECT_URL`: frontend administrativo al que se redirige tras
 *   autenticarse. Su origen debe estar incluido en `CORS_ALLOWED_ORIGINS`.
 * - `SESSION_COOKIE_NAME`: nombre de la cookie de sesión.
 * - `SESSION_COOKIE_PATH`: ruta mínima en la que se envía la cookie.
 * - `SESSION_COOKIE_DOMAIN`: dominio de la cookie (opcional; por defecto la
 *   cookie es «host-only»).
 * - `SESSION_COOKIE_SAMESITE`: `lax`, `strict` o `none`.
 * - `SESSION_COOKIE_SECURE`: `true`/`false`. Por defecto `true` en producción.
 * - `SESSION_IDLE_TIMEOUT_SECONDS`: caducidad por inactividad.
 * - `SESSION_ABSOLUTE_TIMEOUT_SECONDS`: caducidad máxima absoluta.
 * - `SESSION_ROTATION_INTERVAL_SECONDS`: intervalo de renovación del
 *   identificador de sesión.
 */

export const SESSION_COOKIE_NAME_POR_DEFECTO = 'fenix_session';
export const SESSION_COOKIE_PATH_POR_DEFECTO = '/api';
export const SESSION_IDLE_TIMEOUT_SEGUNDOS_POR_DEFECTO = 1_800;
export const SESSION_ABSOLUTE_TIMEOUT_SEGUNDOS_POR_DEFECTO = 43_200;
export const SESSION_ROTATION_INTERVAL_SEGUNDOS_POR_DEFECTO = 300;

export const SESSION_IDLE_TIMEOUT_SEGUNDOS_MINIMO = 60;
export const SESSION_IDLE_TIMEOUT_SEGUNDOS_MAXIMO = 86_400;
export const SESSION_ABSOLUTE_TIMEOUT_SEGUNDOS_MAXIMO = 604_800;
export const SESSION_ROTATION_INTERVAL_SEGUNDOS_MAXIMO = 3_600;

export const VARIABLES_SESION = [
  'AUTH_REDIRECT_URL',
  'SESSION_COOKIE_NAME',
  'SESSION_COOKIE_PATH',
  'SESSION_COOKIE_DOMAIN',
  'SESSION_COOKIE_SAMESITE',
  'SESSION_COOKIE_SECURE',
  'SESSION_IDLE_TIMEOUT_SECONDS',
  'SESSION_ABSOLUTE_TIMEOUT_SECONDS',
  'SESSION_ROTATION_INTERVAL_SECONDS',
] as const;

export type SameSiteSesion = 'lax' | 'strict' | 'none';

export interface ConfiguracionSesion {
  readonly cookieName: string;
  readonly cookiePath: string;
  readonly cookieDomain: string | undefined;
  readonly cookieSameSite: SameSiteSesion;
  readonly cookieSecure: boolean;
  readonly idleTimeoutSegundos: number;
  readonly absoluteTimeoutSegundos: number;
  readonly rotationIntervalSegundos: number;
  readonly redirectUrl: string;
}

/** Error de configuración de sesiones. Impide el arranque de la aplicación. */
export class ConfiguracionSesionInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfiguracionSesionInvalidaError';
  }
}

/**
 * Fuente de configuración con la misma interfaz que `ConfigService` de NestJS.
 * Permite leer la configuración validada sin acoplar este módulo al framework.
 */
export interface FuenteConfiguracion {
  get<T = unknown>(clave: string): T | undefined;
}

/**
 * Valida la configuración de sesiones a partir del entorno.
 *
 * @param entorno Variables de entorno (ya normalizadas o no).
 * @param origenesPermitidos Orígenes CORS explícitos de la aplicación.
 */
export function validarConfiguracionSesion(
  entorno: NodeJS.ProcessEnv,
  origenesPermitidos: readonly string[],
): ConfiguracionSesion {
  const nodeEnv =
    typeof entorno.NODE_ENV === 'string' ? entorno.NODE_ENV.trim() : '';

  const cookieName =
    leerTextoOpcional(entorno, 'SESSION_COOKIE_NAME') ??
    SESSION_COOKIE_NAME_POR_DEFECTO;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cookieName)) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_NAME sólo puede contener letras, números, guiones y guiones bajos',
    );
  }

  const cookiePath =
    leerTextoOpcional(entorno, 'SESSION_COOKIE_PATH') ??
    SESSION_COOKIE_PATH_POR_DEFECTO;
  if (
    !cookiePath.startsWith('/') ||
    cookiePath.includes(';') ||
    cookiePath.includes(' ')
  ) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_PATH debe ser una ruta absoluta sin espacios ni punto y coma',
    );
  }

  const cookieDomain = leerTextoOpcional(entorno, 'SESSION_COOKIE_DOMAIN');
  if (cookieDomain !== undefined && !/^[A-Za-z0-9.-]+$/.test(cookieDomain)) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_DOMAIN debe ser un dominio sin esquema ni ruta',
    );
  }

  const cookieSameSite = leerSameSite(entorno);
  const cookieSecure = leerSecure(entorno, nodeEnv);

  if (cookieSameSite === 'none' && !cookieSecure) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_SAMESITE=none exige SESSION_COOKIE_SECURE=true',
    );
  }

  const idleTimeoutSegundos = leerEntero(
    entorno,
    'SESSION_IDLE_TIMEOUT_SECONDS',
    SESSION_IDLE_TIMEOUT_SEGUNDOS_POR_DEFECTO,
    SESSION_IDLE_TIMEOUT_SEGUNDOS_MINIMO,
    SESSION_IDLE_TIMEOUT_SEGUNDOS_MAXIMO,
  );

  const absoluteTimeoutSegundos = leerEntero(
    entorno,
    'SESSION_ABSOLUTE_TIMEOUT_SECONDS',
    SESSION_ABSOLUTE_TIMEOUT_SEGUNDOS_POR_DEFECTO,
    SESSION_IDLE_TIMEOUT_SEGUNDOS_MINIMO,
    SESSION_ABSOLUTE_TIMEOUT_SEGUNDOS_MAXIMO,
  );

  if (absoluteTimeoutSegundos < idleTimeoutSegundos) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_ABSOLUTE_TIMEOUT_SECONDS no puede ser menor que SESSION_IDLE_TIMEOUT_SECONDS',
    );
  }

  const rotationIntervalSegundos = leerEntero(
    entorno,
    'SESSION_ROTATION_INTERVAL_SECONDS',
    SESSION_ROTATION_INTERVAL_SEGUNDOS_POR_DEFECTO,
    0,
    SESSION_ROTATION_INTERVAL_SEGUNDOS_MAXIMO,
  );

  if (rotationIntervalSegundos > idleTimeoutSegundos) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_ROTATION_INTERVAL_SECONDS no puede ser mayor que SESSION_IDLE_TIMEOUT_SECONDS',
    );
  }

  const redirectUrl = leerTextoOpcional(entorno, 'AUTH_REDIRECT_URL');
  if (!redirectUrl) {
    throw new ConfiguracionSesionInvalidaError(
      'AUTH_REDIRECT_URL es obligatoria: es el frontend administrativo al que se redirige tras autenticarse',
    );
  }

  validarUrlRedireccion(redirectUrl);

  const origenRedireccion = new URL(redirectUrl).origin;
  if (!origenesPermitidos.includes(origenRedireccion)) {
    throw new ConfiguracionSesionInvalidaError(
      `El origen de AUTH_REDIRECT_URL (${origenRedireccion}) debe estar incluido en CORS_ALLOWED_ORIGINS`,
    );
  }

  return {
    cookieName,
    cookiePath,
    cookieDomain,
    cookieSameSite,
    cookieSecure,
    idleTimeoutSegundos,
    absoluteTimeoutSegundos,
    rotationIntervalSegundos,
    redirectUrl,
  };
}

/**
 * Lee la configuración de sesiones desde la configuración ya validada de la
 * aplicación. Si algún valor es incorrecto, se lanza el error de
 * configuración: la aplicación falla de forma explícita en lugar de
 * degradar silenciosamente la seguridad.
 */
export function leerConfiguracionSesion(
  fuente: FuenteConfiguracion,
): ConfiguracionSesion {
  const entorno: Record<string, unknown> = {};

  for (const variable of VARIABLES_SESION) {
    const valor = fuente.get<unknown>(variable);
    if (valor !== undefined && valor !== null && valor !== '') {
      entorno[variable] = valor;
    }
  }

  const nodeEnv = fuente.get<string>('NODE_ENV');
  if (nodeEnv !== undefined) {
    entorno.NODE_ENV = nodeEnv;
  }

  const origenes = (fuente.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen !== '');

  return validarConfiguracionSesion(entorno as NodeJS.ProcessEnv, origenes);
}

function leerTextoOpcional(
  entorno: NodeJS.ProcessEnv,
  variable: string,
): string | undefined {
  const valor = entorno[variable];
  if (valor === undefined) {
    return undefined;
  }

  const texto = String(valor).trim();
  return texto === '' ? undefined : texto;
}

function leerSameSite(entorno: NodeJS.ProcessEnv): SameSiteSesion {
  const valor = leerTextoOpcional(entorno, 'SESSION_COOKIE_SAMESITE');
  if (valor === undefined) {
    return 'lax';
  }

  const normalizado = valor.toLowerCase();
  if (
    normalizado !== 'lax' &&
    normalizado !== 'strict' &&
    normalizado !== 'none'
  ) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_SAMESITE sólo admite lax, strict o none',
    );
  }

  return normalizado;
}

function leerSecure(entorno: NodeJS.ProcessEnv, nodeEnv: string): boolean {
  const valor = leerTextoOpcional(entorno, 'SESSION_COOKIE_SECURE');

  if (valor === undefined) {
    return nodeEnv === 'production';
  }

  const normalizado = valor.toLowerCase();
  if (normalizado !== 'true' && normalizado !== 'false') {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_SECURE sólo admite true o false',
    );
  }

  const secure = normalizado === 'true';

  if (nodeEnv === 'production' && !secure) {
    throw new ConfiguracionSesionInvalidaError(
      'SESSION_COOKIE_SECURE no puede desactivarse en producción',
    );
  }

  return secure;
}

function leerEntero(
  entorno: NodeJS.ProcessEnv,
  variable: string,
  porDefecto: number,
  minimo: number,
  maximo: number,
): number {
  const valor = leerTextoOpcional(entorno, variable);
  if (valor === undefined) {
    return porDefecto;
  }

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new ConfiguracionSesionInvalidaError(
      `${variable} debe ser un entero entre ${minimo} y ${maximo}`,
    );
  }

  return numero;
}

function validarUrlRedireccion(valor: string): void {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new ConfiguracionSesionInvalidaError(
      'AUTH_REDIRECT_URL debe ser una URL absoluta válida',
    );
  }

  if (url.protocol === 'http:') {
    const esLocalhost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1';

    if (!esLocalhost) {
      throw new ConfiguracionSesionInvalidaError(
        'AUTH_REDIRECT_URL debe utilizar el protocolo https',
      );
    }
  } else if (url.protocol !== 'https:') {
    throw new ConfiguracionSesionInvalidaError(
      'AUTH_REDIRECT_URL debe utilizar el protocolo http o https',
    );
  }
}
