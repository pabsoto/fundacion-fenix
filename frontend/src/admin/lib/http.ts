const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorResponse {
  message: string | string[];
}

async function request<T>(
  endpoint: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init?.headers,
  };

  if (!init?.skipAuth) {
    // TODO: Add Authorization header when JWT is available
    // const token = getToken();
    // if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let message = `Error (${response.status})`;

    try {
      const body = (await response.json()) as ErrorResponse;
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 401) {
      // TODO: Trigger logout with "Tu sesión expiró"
    } else if (response.status === 403) {
      message = 'Tu correo no tiene acceso al panel';
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const http = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
