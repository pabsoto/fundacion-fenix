import { campaignsMock } from '@/data/campaigns.mock';
import { fetchApi } from './api';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export async function getCampaigns() {
  if (USE_MOCKS) {
    return campaignsMock;
  }
  return fetchApi('/campaigns');
}

export async function getCampaignById(id: string) {
  if (USE_MOCKS) {
    return campaignsMock.find((c) => c.id === id);
  }
  return fetchApi(`/campaigns/${id}`);
}
