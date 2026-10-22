import { storiesMock } from '@/data/stories.mock';
import { fetchApi } from './api';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export async function getStories() {
  if (USE_MOCKS) {
    return storiesMock;
  }
  return fetchApi('/stories');
}

export async function getStoryById(id: string) {
  if (USE_MOCKS) {
    return storiesMock.find((s) => s.id === id);
  }
  return fetchApi(`/stories/${id}`);
}
