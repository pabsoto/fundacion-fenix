import { useQuery } from '@tanstack/react-query';
import { getStats } from '@/services/stats.service';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });
}
