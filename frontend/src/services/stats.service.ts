import { statsMock } from '@/data/stats.mock';
import { fetchApi } from './api';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export async function getStats() {
  if (USE_MOCKS) {
    return statsMock;
  }
  return fetchApi('/stats');
}
