import { campaignsMock } from '@/data/campaigns.mock';
import { DEMO_SHOWCASE } from '@/lib/demo';
import type { Campaign } from '@/types';
import { fetchApi } from './api';

type ApiCampaign = {
  id: string;
  lugar: string;
  fecha: string;
  perros: number;
  gatos: number;
  machos: number;
  hembras: number;
  total: number;
  fotos: string[];
};

function fromApi(campaign: ApiCampaign): Campaign {
  const date = new Date(`${campaign.fecha}T00:00:00Z`);
  return {
    id: campaign.id,
    place: campaign.lugar,
    year: date.getUTCFullYear(),
    months: [date.getUTCMonth() + 1],
    total: campaign.total,
    dogs: campaign.perros,
    cats: campaign.gatos,
    males: campaign.machos,
    females: campaign.hembras,
    photos: campaign.fotos,
  };
}

export async function getCampaigns(params?: { year?: number }): Promise<Campaign[]> {
  if (DEMO_SHOWCASE) {
    if (params?.year != null) {
      return campaignsMock.filter((c) => c.year === params.year);
    }
    return campaignsMock;
  }
  const query = params?.year != null ? `?anio=${params.year}` : '';
  const campaigns = await fetchApi<ApiCampaign[]>(`/public/campanas${query}`);
  return campaigns.map(fromApi);
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  if (DEMO_SHOWCASE) {
    return campaignsMock.find((c) => c.id === id);
  }
  const campaigns = await getCampaigns();
  return campaigns.find((campaign) => campaign.id === id);
}
