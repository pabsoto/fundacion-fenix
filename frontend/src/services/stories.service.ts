import { storiesMock } from '@/data/stories.mock';
import type { Story } from '@/types';
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export async function getStories(): Promise<Story[]> {
  if (USE_MOCKS) {
    return storiesMock;
  }
  return [];
}

export async function getStory(id: string): Promise<Story | undefined> {
  if (USE_MOCKS) {
    return storiesMock.find((s) => s.id === id);
  }
  return undefined;
}
