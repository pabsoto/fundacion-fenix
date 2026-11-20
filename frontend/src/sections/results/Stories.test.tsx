import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { storiesMock } from '@/data/stories.mock';
import { Stories } from './Stories';

vi.mock('@/hooks/useStories', () => ({
  useStories: () => ({ data: storiesMock, isPending: false, isError: false }),
}));

vi.mock('@/hooks/useCarousel', () => ({
  useCarousel: () => ({
    emblaRef: vi.fn(),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    canPrev: false,
    canNext: false,
  }),
}));

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

afterEach(cleanup);

describe('Stories en modo demostración', () => {
  it('muestra título, fecha y autor de las historias ficticias', async () => {
    await i18n.changeLanguage('es');
    render(<Stories />);

    expect(screen.getByText('Datos de demostración')).toBeTruthy();
    for (const title of ['Apolo encontró un hogar', 'Luna sigue adelante', 'Max avanza cada día']) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.getByText('12 de septiembre de 2026')).toBeTruthy();
    expect(screen.getByText('Por Equipo FÉNIX')).toBeTruthy();
    expect(screen.queryByText('Adoptado')).toBeNull();
    expect(screen.queryByText('En recuperación')).toBeNull();
    expect(screen.getAllByText(/Historia ficticia de demostración:/)).toHaveLength(3);
  });
});
