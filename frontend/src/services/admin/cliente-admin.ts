/**
 * Cliente HTTP del panel administrativo.
 * Envía la cookie de sesión y, en las escrituras, el token CSRF que el
 * `AdminGuard` guarda al confirmar la sesión.
 */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

let csrfToken: string | null = null;

export function fijarCsrfAdmin(token: string | null): void {
  csrfToken = token;
}

export class ErrorApiAdmin extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ErrorApiAdmin';
    this.status = status;
  }
}

type CuerpoError = { message?: string | string[] } | null;

async function solicitar<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const metodo = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (metodo !== 'GET' && csrfToken) headers.set('X-CSRF-Token', csrfToken);

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const cuerpo = (await response.json().catch(() => null)) as CuerpoError;
    const mensaje = Array.isArray(cuerpo?.message) ? cuerpo.message[0] : cuerpo?.message;
    throw new ErrorApiAdmin(response.status, mensaje ?? `Error del servicio (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function pedirJson<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  return solicitar<T>(endpoint, { signal });
}

export function enviarJson<T>(
  metodo: 'POST' | 'PUT',
  endpoint: string,
  cuerpo: unknown,
): Promise<T> {
  return solicitar<T>(endpoint, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

/** El backend espera el archivo en el campo `archivo`. */
export function enviarArchivo<T>(endpoint: string, archivo: File): Promise<T> {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  return solicitar<T>(endpoint, { method: 'POST', body: formulario });
}

/** Quita la hora de una fecha ISO. El panel trabaja con AAAA-MM-DD. */
export function soloFecha(valor: string | null | undefined): string | null {
  return valor ? valor.slice(0, 10) : null;
}

/** DELETE sin cuerpo. El API responde 204. */
export function borrar(endpoint: string): Promise<void> {
  return solicitar<void>(endpoint, { method: 'DELETE' });
}
