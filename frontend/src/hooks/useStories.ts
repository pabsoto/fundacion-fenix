import { useQuery } from '@tanstack/react-query';
import { getStories } from '@/services/stories.service';

export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: getStories,
  });
}
