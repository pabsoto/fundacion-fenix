import { storiesMock } from '@/data/stories.mock';
import { DEMO_SHOWCASE } from '@/lib/demo';
import type { Story } from '@/types';

export async function getStories(): Promise<Story[]> {
  if (DEMO_SHOWCASE) {
    return storiesMock;
  }
  return [];
}

export async function getStory(id: string): Promise<Story | undefined> {
  if (DEMO_SHOWCASE) {
    return storiesMock.find((s) => s.id === id);
  }
  return undefined;
}
