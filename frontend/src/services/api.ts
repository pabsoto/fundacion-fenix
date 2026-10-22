const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export async function fetchApi<T>(endpoint: string): Promise<T> {
  if (USE_MOCKS) {
    // When using mocks, services will return mock data directly
    throw new Error('Mock mode: use service-specific mock functions');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
