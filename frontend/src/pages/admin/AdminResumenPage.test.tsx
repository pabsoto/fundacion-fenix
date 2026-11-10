import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminResumenPage } from '@/pages/admin/AdminResumenPage';
import type { Resumen } from '@/types/admin';

const getResumen = vi.hoisted(() => vi.fn());

vi.mock('@/services/admin/resumen.service', () => ({
  getResumen,
}));

const vacio: Resumen = {
  esterilizaciones: { total: 0, jornadas: 0 },
  enLaFundacion: { cantidad: 0, registrados: 0 },
  adopcionesDelAnio: { cantidad: 0, anio: 2026 },
  diasHastaAdoptar: null,
  serie: [
    { anio: 2025, mes: 12, ingresos: 0, adopciones: 0 },
    { anio: 2026, mes: 1, ingresos: 0, adopciones: 0 },
  ],
  espera: [],
};

afterEach(() => {
  cleanup();
  getResumen.mockReset();
});

describe('AdminResumenPage', () => {
  it('muestra ceros, la raya y la lista vacía', async () => {
    getResumen.mockResolvedValue(vacio);
    render(<AdminResumenPage />);

    expect(await screen.findByText('en 0 jornadas')).toBeTruthy();
    expect(screen.getByText('de 0 animales registrados')).toBeTruthy();
    expect(screen.getByText('en lo que va de 2026')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('Todavía no hay registros.')).toBeTruthy();
    expect(screen.getByText('Dic')).toBeTruthy();
    expect(screen.getByText('Ene')).toBeTruthy();
  });

  it('reintenta después de un error', async () => {
    getResumen.mockRejectedValueOnce(new Error('fallo')).mockResolvedValueOnce(vacio);
    render(<AdminResumenPage />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('en 0 jornadas')).toBeTruthy();
  });
});
