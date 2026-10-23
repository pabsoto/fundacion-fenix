import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import '@/i18n';
import { Pillars } from './Pillars';

const institutionalText = vi.fn<(key: string, field?: 'titulo' | 'descripcion') => string>();

vi.mock('@/hooks/useInstitutionalContent', () => ({
  useInstitutionalContent: () => ({ text: institutionalText }),
}));

afterEach(() => {
  cleanup();
  institutionalText.mockReset();
});

describe('Pillars', () => {
  it('mantiene exactamente tres tarjetas al cargar el contenido institucional', () => {
    institutionalText.mockReturnValue('');
    const { container, rerender } = render(<Pillars />);

    institutionalText.mockImplementation((key, field = 'descripcion') =>
      field === 'titulo' ? `Título ${key}` : `Descripción ${key}`,
    );
    rerender(<Pillars />);

    const cards = container.querySelectorAll('[data-pillar-id]');
    expect(cards).toHaveLength(3);
    expect([...cards].map((card) => card.getAttribute('data-pillar-id'))).toEqual([
      'rehabilitation',
      'education',
      'sterilization',
    ]);
  });
});
