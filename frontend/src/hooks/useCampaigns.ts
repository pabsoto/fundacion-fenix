import { useQuery } from '@tanstack/react-query';
import { getCampaign, getCampaigns } from '@/services/campaigns.service';

export function useCampaigns(year?: number) {
  return useQuery({
    queryKey: ['campaigns', year],
    queryFn: () => getCampaigns(year != null ? { year } : undefined),
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id!),
    enabled: Boolean(id),
  });
}
