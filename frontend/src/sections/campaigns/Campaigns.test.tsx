import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { campaignsMock } from '@/data/campaigns.mock';
import { statsMock } from '@/data/stats.mock';
import { Campaigns } from './Campaigns';

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: campaignsMock, isPending: false, isError: false }),
}));

vi.mock('@/hooks/useStats', () => ({
  useStats: () => ({ data: statsMock, isPending: false, isError: false }),
}));

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

afterEach(() => {
  cleanup();
  void i18n.changeLanguage('es');
});

describe('Campaigns en modo demostración', () => {
  it('cambia de año y permite abrir el detalle de cada campaña', async () => {
    await i18n.changeLanguage('es');
    render(<Campaigns />);

    expect(screen.getByText('Datos de demostración')).toBeTruthy();
    expect(screen.getAllByText('Villa Adela, El Alto')).toHaveLength(2);
    expect(screen.getByText('1.368')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2024' }));
    expect(screen.getAllByText('Distrito 4, El Alto')).toHaveLength(2);

    fireEvent.click(screen.getByRole('option', { name: /Obrajes, La Paz/ }));
    expect(screen.getByRole('heading', { name: 'Obrajes, La Paz' })).toBeTruthy();
    expect(screen.getByText('91')).toBeTruthy();
  });
});
