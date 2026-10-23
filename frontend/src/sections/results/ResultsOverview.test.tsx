import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { statsMock } from '@/data/stats.mock';
import { ResultsOverview } from './ResultsOverview';

vi.mock('@/hooks/useStats', () => ({
  useStats: () => ({ data: statsMock, isPending: false, isError: false }),
}));

afterEach(cleanup);

describe('ResultsOverview', () => {
  it('mantiene totales, porcentajes y gráficos coherentes', async () => {
    await i18n.changeLanguage('es');
    render(<ResultsOverview />);

    expect(screen.getByText('1.368')).toBeTruthy();
    expect(screen.getAllByText('725').length).toBeGreaterThan(0);
    expect(screen.getAllByText('643').length).toBeGreaterThan(0);
    expect(screen.getByText('350 (48,3%)')).toBeTruthy();
    expect(screen.getByText('375 (51,7%)')).toBeTruthy();
    expect(screen.getByText('312 (48,5%)')).toBeTruthy();
    expect(screen.getByText('331 (51,5%)')).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
});
