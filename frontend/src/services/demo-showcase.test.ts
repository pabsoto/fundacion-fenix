import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('VITE_DEMO_SHOWCASE', () => {
  it('usa exclusivamente los fixtures de campañas, resultados e historias', async () => {
    vi.stubEnv('VITE_DEMO_SHOWCASE', 'true');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const [{ getCampaigns }, { getStats }, { getStories }] = await Promise.all([
      import('./campaigns.service'),
      import('./stats.service'),
      import('./stories.service'),
    ]);

    const campaigns = await getCampaigns();
    const stats = await getStats();
    const stories = await getStories();

    expect(campaigns.map((campaign) => campaign.id)).toEqual([
      'villa-adela-2025',
      'achumani-2025',
      'distrito-4-2024',
      'obrajes-2024',
      'ciudad-satelite-2024',
    ]);
    expect(stats.caninos).toEqual({ total: 725, males: 350, females: 375 });
    expect(stats.felinos).toEqual({ total: 643, males: 312, females: 331 });
    expect(stats.caninos.total + stats.felinos.total).toBe(1368);
    expect(stories.map((story) => story.id)).toEqual(['apolo', 'luna', 'max']);
    expect(stories.every((story) => story.textKey.startsWith('stories.demo_'))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('vuelve a la API real o al estado vacío cuando se desactiva', async () => {
    vi.stubEnv('VITE_DEMO_SHOWCASE', 'false');
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const body = url.endsWith('/public/campanas')
        ? [{
            id: 'real-1',
            lugar: 'Real',
            fecha: '2026-10-23',
            perros: 1,
            gatos: 2,
            machos: 1,
            hembras: 2,
            total: 3,
            fotos: [],
          }]
        : { caninos: { total: 1, machos: 1, hembras: 0 }, felinos: { total: 2, machos: 0, hembras: 2 } };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const [{ getCampaigns }, { getStats }, { getStories }] = await Promise.all([
      import('./campaigns.service'),
      import('./stats.service'),
      import('./stories.service'),
    ]);

    expect((await getCampaigns()).map((campaign) => campaign.id)).toEqual(['real-1']);
    expect(await getStats()).toEqual({
      caninos: { total: 1, males: 1, females: 0 },
      felinos: { total: 2, males: 0, females: 2 },
    });
    expect(await getStories()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
