const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function fetchApi<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
