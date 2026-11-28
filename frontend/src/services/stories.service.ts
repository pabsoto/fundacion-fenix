import { storiesMock } from '@/data/stories.mock';
import { DEMO_SHOWCASE } from '@/lib/demo';
import type { Story } from '@/types';
import { fetchApi } from './api';

type FotoPublica = {
  url: string;
  ancho: number | null;
  alto: number | null;
};

type HistoriaPublica = {
  id: string;
  animalNombre: string;
  tituloEs: string;
  tituloEn: string;
  textoEs: string;
  textoEn: string;
  autorNombre: string | null;
  fechaHistoria: string;
  foto: FotoPublica | null;
};

/** Copia solo los campos públicos al tipo de la landing. */
function aStory(historia: HistoriaPublica): Story {
  const story: Story = {
    id: historia.id,
    animalName: historia.animalNombre,
    title: { es: historia.tituloEs, en: historia.tituloEn },
    text: { es: historia.textoEs, en: historia.textoEn },
    date: historia.fechaHistoria.slice(0, 10),
  };
  if (historia.autorNombre) story.author = historia.autorNombre;
  if (historia.foto?.url) {
    story.photo = historia.foto.url;
    if (historia.foto.ancho != null) story.photoWidth = historia.foto.ancho;
    if (historia.foto.alto != null) story.photoHeight = historia.foto.alto;
  }
  return story;
}

export async function getStories(): Promise<Story[]> {
  if (DEMO_SHOWCASE) return storiesMock;
  const historias = await fetchApi<HistoriaPublica[]>('/public/historias');
  return historias.map(aStory);
}

export async function getStory(id: string): Promise<Story | undefined> {
  const stories = await getStories();
  return stories.find((story) => story.id === id);
}
