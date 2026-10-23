import { useQuery } from '@tanstack/react-query';
import { getPublicDonation } from '@/services/donations.service';

export function useDonation() {
  return useQuery({
    queryKey: ['public-donation'],
    queryFn: getPublicDonation,
  });
}
