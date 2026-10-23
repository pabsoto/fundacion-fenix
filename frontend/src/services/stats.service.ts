import { statsMock } from '@/data/stats.mock';
import type { Stats } from '@/types';
import { fetchApi } from './api';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export async function getStats(): Promise<Stats> {
  if (USE_MOCKS) {
    return statsMock;
  }
  return fetchApi<Stats>('/stats');
}
