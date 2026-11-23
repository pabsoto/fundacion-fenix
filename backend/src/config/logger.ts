import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

export const CABECERA_ID_PETICION = 'x-request-id';
export const NIVELES_LOG = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;
export type NivelLog = (typeof NIVELES_LOG)[number];
export const NIVEL_LOG_POR_DEFECTO: NivelLog = 'info';

// Un id entrante sólo se reutiliza si es corto y no contiene caracteres que
// permitan inyectar saltos de línea u otro contenido en los logs.
const ID_PETICION_VALIDO = /^[A-Za-z0-9._-]{1,128}$/;

export function validarNivelLog(value: unknown): NivelLog {
  if (value === undefined) {
    return NIVEL_LOG_POR_DEFECTO;
  }

  const nivel = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!(NIVELES_LOG as readonly string[]).includes(nivel)) {
    throw new Error(`LOG_LEVEL debe ser uno de: ${NIVELES_LOG.join(', ')}`);
  }

  return nivel as NivelLog;
}

/**
 * Obtiene el id de la petición (reutilizando `x-request-id` si es válido o
 * generando uno nuevo) y lo devuelve también en la cabecera de la respuesta.
 */
export function generarIdPeticion(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const entrante = req.headers[CABECERA_ID_PETICION];
  const candidato = Array.isArray(entrante) ? entrante[0] : entrante;
  const id =
    candidato && ID_PETICION_VALIDO.test(candidato) ? candidato : randomUUID();

  res.setHeader(CABECERA_ID_PETICION, id);
  return id;
}

export function nivelPorEstado(statusCode: number, error?: Error): NivelLog {
  if (error || statusCode >= 500) {
    return 'error';
  }

  return statusCode >= 400 ? 'warn' : 'info';
}

export function crearParametrosLogger(
  nivel: NivelLog,
  nodeEnv: string | undefined,
): Params {
  return {
    pinoHttp: {
      level: nivel,
      genReqId: generarIdPeticion,
      customLogLevel: (_req, res, error) =>
        nivelPorEstado(res.statusCode, error),
      customSuccessMessage: (req, res) =>
        `${req.method} ${rutaSinConsulta(req.url)} ${res.statusCode}`,
      customErrorMessage: (req, res) =>
        `${req.method} ${rutaSinConsulta(req.url)} ${res.statusCode}`,
      // Sólo se registran los campos necesarios: nunca cabeceras ni cuerpo.
      serializers: {
        req: (req: { id: unknown; method: string; url?: string }) => ({
          id: req.id,
          method: req.method,
          // La cadena de consulta puede llevar códigos de autorización.
          url: rutaSinConsulta(req.url),
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-csrf-token"]',
          'res.headers["set-cookie"]',
        ],
        censor: '[Redacted]',
      },
      ...(nodeEnv === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : {}),
    },
  };
}

function rutaSinConsulta(url: string | undefined): string {
  return (url ?? '').split('?')[0];
}
