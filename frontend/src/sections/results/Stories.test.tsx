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
  it('muestra Apolo, Luna y Max como historias ficticias', async () => {
    await i18n.changeLanguage('es');
    render(<Stories />);

    expect(screen.getByText('Datos de demostración')).toBeTruthy();
    for (const name of ['Apolo', 'Luna', 'Max']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy();
    }
    expect(screen.getAllByText(/Historia ficticia de demostración:/)).toHaveLength(3);
  });
});
