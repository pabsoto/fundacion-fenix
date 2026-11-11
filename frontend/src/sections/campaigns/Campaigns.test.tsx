import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { campaignsMock } from '@/data/campaigns.mock';
import { statsMock } from '@/data/stats.mock';
import type { Campaign } from '@/types';
import { Campaigns } from './Campaigns';

const { campaignsState } = vi.hoisted(() => ({
  campaignsState: { current: [] as Campaign[] },
}));

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: () => ({ data: campaignsState.current, isPending: false, isError: false }),
}));

vi.mock('@/hooks/useStats', () => ({
  useStats: () => ({ data: statsMock, isPending: false, isError: false }),
}));

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

function jornada(
  parcial: Pick<Campaign, 'id' | 'place' | 'year' | 'months' | 'fecha'> & Partial<Campaign>,
): Campaign {
  return {
    city: undefined,
    total: 10,
    dogs: 6,
    cats: 4,
    males: 5,
    females: 5,
    photos: [],
    ...parcial,
  };
}

afterEach(() => {
  cleanup();
  void i18n.changeLanguage('es');
});

describe('Campaigns en modo demostración', () => {
  it('cambia de año y permite abrir el detalle de cada campaña', async () => {
    campaignsState.current = campaignsMock;
    await i18n.changeLanguage('es');
    render(<Campaigns />);

    expect(screen.getByText('Datos de demostración')).toBeTruthy();
    expect(screen.getAllByText('Villa Adela, El Alto')).toHaveLength(2);
    expect(screen.getAllByText('Mar 2025').length).toBeGreaterThan(0);
    expect(screen.getByText('1.368')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '2024' }));
    expect(screen.getAllByText('Distrito 4, El Alto')).toHaveLength(2);

    fireEvent.click(screen.getByRole('option', { name: /Obrajes, La Paz/ }));
    expect(screen.getByRole('heading', { name: 'Obrajes, La Paz' })).toBeTruthy();
    expect(screen.getByText('91')).toBeTruthy();
  });

  it('ordena por fecha, elige la más reciente aunque su año no sea el calendario y deja al final la que no tiene fecha', async () => {
    const anio = new Date().getFullYear();
    campaignsState.current = [
      jornada({
        id: 'sin-fecha',
        place: 'Sin fecha',
        year: anio,
        months: [2],
        fecha: null,
      }),
      jornada({
        id: 'enero',
        place: 'Enero',
        year: anio - 1,
        months: [1],
        fecha: `${anio - 1}-01-01`,
      }),
      jornada({
        id: 'marzo',
        place: 'Marzo',
        year: anio - 1,
        months: [3],
        fecha: `${anio - 1}-03-01`,
      }),
    ];
    await i18n.changeLanguage('es');
    render(<Campaigns />);

    expect(screen.getByRole('button', { name: String(anio - 1), pressed: true })).toBeTruthy();
    const opciones = screen.getAllByRole('option');
    expect(opciones.map((opcion) => opcion.textContent ?? '')).toEqual([
      expect.stringContaining('Marzo'),
      expect.stringContaining('Enero'),
    ]);
    expect(screen.getByRole('option', { name: /Marzo/, selected: true })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Marzo' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Sin fecha/ })).toBeNull();
  });

  it('al cambiar de año selecciona la primera de ese año y no una jornada sin fecha', async () => {
    const anio = new Date().getFullYear();
    campaignsState.current = [
      jornada({
        id: 'sin-fecha',
        place: 'Sin fecha',
        year: anio,
        months: [6],
        fecha: null,
      }),
      jornada({
        id: 'junio',
        place: 'Junio',
        year: anio,
        months: [6],
        fecha: `${anio}-06-01`,
      }),
      jornada({
        id: 'marzo',
        place: 'Marzo',
        year: anio - 1,
        months: [3],
        fecha: `${anio - 1}-03-01`,
      }),
    ];
    await i18n.changeLanguage('es');
    render(<Campaigns />);

    expect(screen.getByRole('option', { name: /Junio/, selected: true })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: String(anio - 1) }));

    expect(screen.getByRole('option', { name: /Marzo/, selected: true })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Marzo' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: String(anio) }));

    const opciones = screen.getAllByRole('option');
    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      expect.stringContaining('Junio'),
      expect.stringContaining('Sin fecha'),
    ]);
    expect(screen.getByRole('option', { name: /Junio/, selected: true })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Sin fecha/ }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });
});
