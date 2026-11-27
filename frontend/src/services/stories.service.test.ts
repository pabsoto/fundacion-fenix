import { afterEach, describe, expect, it, vi } from 'vitest';
import { storiesMock } from '@/data/stories.mock';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const HISTORIA = {
  id: '11111111-1111-4111-8111-111111111111',
  animalNombre: 'Luna',
  tituloEs: 'Luna encontró un hogar',
  tituloEn: 'Luna found a home',
  textoEs: 'Texto de Luna.',
  textoEn: 'Text about Luna.',
  autorNombre: 'Familia Quispe',
  fechaHistoria: '2026-10-01',
  foto: { url: 'https://cdn.test/luna.jpg', ancho: 900, alto: 1600 },
  orden: 4,
  visible: true,
  creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  fotoRuta: 'historias/luna/secreta.jpg',
};

describe('getStories', () => {
  it('en modo demostración usa el mock y no llama a la API', async () => {
    vi.stubEnv('VITE_DEMO_SHOWCASE', 'true');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getStories } = await import('./stories.service');

    expect(await getStories()).toEqual(storiesMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fuera del modo demostración mapea el endpoint y descarta campos internos', async () => {
    vi.stubEnv('VITE_DEMO_SHOWCASE', 'false');
    const fetchMock = vi.fn(async () =>
      Response.json([
        HISTORIA,
        {
          id: '22222222-2222-4222-8222-222222222222',
          animalNombre: 'Max',
          tituloEs: 'Max avanza',
          tituloEn: 'Max moves forward',
          textoEs: 'Texto de Max.',
          textoEn: 'Text about Max.',
          autorNombre: null,
          fechaHistoria: '2026-08-03T00:00:00.000Z',
          foto: { url: 'https://cdn.test/max.webp', ancho: 1600, alto: 900 },
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          animalNombre: 'Nube',
          tituloEs: 'Nube espera',
          tituloEn: 'Nube waits',
          textoEs: 'Texto de Nube.',
          textoEn: 'Text about Nube.',
          autorNombre: '',
          fechaHistoria: '2026-07-20',
          foto: null,
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getStories, getStory } = await import('./stories.service');
    const stories = await getStories();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/public/historias',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(stories).toEqual([
      {
        id: HISTORIA.id,
        animalName: 'Luna',
        title: { es: 'Luna encontró un hogar', en: 'Luna found a home' },
        text: { es: 'Texto de Luna.', en: 'Text about Luna.' },
        author: 'Familia Quispe',
        date: '2026-10-01',
        photo: 'https://cdn.test/luna.jpg',
        photoWidth: 900,
        photoHeight: 1600,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        animalName: 'Max',
        title: { es: 'Max avanza', en: 'Max moves forward' },
        text: { es: 'Texto de Max.', en: 'Text about Max.' },
        date: '2026-08-03',
        photo: 'https://cdn.test/max.webp',
        photoWidth: 1600,
        photoHeight: 900,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        animalName: 'Nube',
        title: { es: 'Nube espera', en: 'Nube waits' },
        text: { es: 'Texto de Nube.', en: 'Text about Nube.' },
        date: '2026-07-20',
      },
    ]);
    expect(stories[0]).not.toHaveProperty('creadoPorId');
    expect(stories[0]).not.toHaveProperty('fotoRuta');
    expect(stories[0]).not.toHaveProperty('orden');
    expect(await getStory(HISTORIA.id)).toEqual(stories[0]);
    expect(await getStory('no-existe')).toBeUndefined();
  });
});
