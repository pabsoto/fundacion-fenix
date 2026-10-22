const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(
  /\/$/,
  '',
);

export interface Administrador {
  id: string;
  nombre: string;
}

export interface SesionActual {
  autenticado: true;
  administrador: Administrador;
  csrfToken: string;
  expiraEn: string;
}

export interface EstadoAdministrativo {
  status: 'ok';
  administrador: Administrador;
  timestamp: string;
}

interface ApiErrorBody {
  message?: string;
}

export class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Error del servicio de autenticación (${response.status})`;

    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.message) message = body.message;
    } catch {
      // La respuesta de error puede no tener cuerpo JSON.
    }

    throw new AuthApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function iniciarLogin(): void {
  window.location.assign(`${API_URL}/auth/google`);
}

export function consultarSesion(signal?: AbortSignal): Promise<SesionActual> {
  return request<SesionActual>('/auth/me', { signal });
}

export function consultarEstadoAdministrativo(
  signal?: AbortSignal,
): Promise<EstadoAdministrativo> {
  return request<EstadoAdministrativo>('/admin/health', { signal });
}

export function cerrarSesion(csrfToken: string): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });
}
