import { campaignsMock } from '@/data/campaigns.mock';
import { DEMO_SHOWCASE } from '@/lib/demo';
import type { Campaign } from '@/types';
import { fetchApi } from './api';

type ApiCampaign = {
  id: string;
  lugar: string;
  fecha: string | null;
  perros: number;
  gatos: number;
  machos: number;
  hembras: number;
  total: number;
  fotos: string[];
  tituloEs?: string | null;
  tituloEn?: string | null;
  descripcionEs?: string | null;
  descripcionEn?: string | null;
};

/** Fecha más reciente primero. Sin fecha van al final. Si empatan, el id fija el orden. */
export function ordenarCampanas(campaigns: Campaign[]): Campaign[] {
  return [...campaigns].sort((a, b) => {
    if (!a.fecha && !b.fecha) return a.id.localeCompare(b.id);
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    const porFecha = b.fecha.localeCompare(a.fecha);
    return porFecha !== 0 ? porFecha : a.id.localeCompare(b.id);
  });
}

function fromApi(campaign: ApiCampaign): Campaign {
  const fecha = campaign.fecha ? campaign.fecha.slice(0, 10) : null;
  const date = fecha ? new Date(`${fecha}T00:00:00Z`) : null;
  return {
    id: campaign.id,
    place: campaign.lugar,
    year: date ? date.getUTCFullYear() : 0,
    months: date ? [date.getUTCMonth() + 1] : [],
    fecha,
    total: campaign.total,
    dogs: campaign.perros,
    cats: campaign.gatos,
    males: campaign.machos,
    females: campaign.hembras,
    photos: campaign.fotos,
    tituloEs: campaign.tituloEs ?? null,
    tituloEn: campaign.tituloEn ?? null,
    descripcionEs: campaign.descripcionEs ?? null,
    descripcionEn: campaign.descripcionEn ?? null,
  };
}

export async function getCampaigns(params?: { year?: number }): Promise<Campaign[]> {
  if (DEMO_SHOWCASE) {
    const lista =
      params?.year != null ? campaignsMock.filter((c) => c.year === params.year) : campaignsMock;
    return ordenarCampanas(lista);
  }
  const query = params?.year != null ? `?anio=${params.year}` : '';
  const campaigns = await fetchApi<ApiCampaign[]>(`/public/campanas${query}`);
  return ordenarCampanas(campaigns.map(fromApi));
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  if (DEMO_SHOWCASE) {
    return campaignsMock.find((c) => c.id === id);
  }
  const campaigns = await getCampaigns();
  return campaigns.find((campaign) => campaign.id === id);
}
