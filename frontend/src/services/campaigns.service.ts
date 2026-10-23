import { campaignsMock } from '@/data/campaigns.mock';
import type { Campaign } from '@/types';
import { fetchApi } from './api';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export async function getCampaigns(params?: { year?: number }): Promise<Campaign[]> {
  if (USE_MOCKS) {
    if (params?.year != null) {
      return campaignsMock.filter((c) => c.year === params.year);
    }
    return campaignsMock;
  }
  const query = params?.year != null ? `?year=${params.year}` : '';
  return fetchApi<Campaign[]>(`/campaigns${query}`);
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  if (USE_MOCKS) {
    return campaignsMock.find((c) => c.id === id);
  }
  return fetchApi<Campaign>(`/campaigns/${id}`);
}
