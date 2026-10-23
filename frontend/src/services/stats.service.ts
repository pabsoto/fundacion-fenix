import { statsMock } from '@/data/stats.mock';
import { DEMO_SHOWCASE } from '@/lib/demo';
import type { Stats } from '@/types';
import { fetchApi } from './api';

type ApiSpeciesStats = {
  total: number;
  machos: number;
  hembras: number;
};

type ApiStats = {
  caninos: ApiSpeciesStats;
  felinos: ApiSpeciesStats;
};

function fromApi(stats: ApiStats): Stats {
  return {
    caninos: {
      total: stats.caninos.total,
      males: stats.caninos.machos,
      females: stats.caninos.hembras,
    },
    felinos: {
      total: stats.felinos.total,
      males: stats.felinos.machos,
      females: stats.felinos.hembras,
    },
  };
}

export async function getStats(): Promise<Stats> {
  if (DEMO_SHOWCASE) {
    return statsMock;
  }
  return fromApi(await fetchApi<ApiStats>('/public/estadisticas'));
}
