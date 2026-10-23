import { storiesMock } from '@/data/stories.mock';
import type { Story } from '@/types';
import { fetchApi } from './api';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export async function getStories(): Promise<Story[]> {
  if (USE_MOCKS) {
    return storiesMock;
  }
  return fetchApi<Story[]>('/stories');
}

export async function getStory(id: string): Promise<Story | undefined> {
  if (USE_MOCKS) {
    return storiesMock.find((s) => s.id === id);
  }
  return fetchApi<Story>(`/stories/${id}`);
}
