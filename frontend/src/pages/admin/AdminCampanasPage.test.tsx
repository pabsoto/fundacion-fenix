import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';

afterEach(() => {
  cleanup();
});

describe('AdminCampanasPage', () => {
  it('filtra por año y mes, deja en gris un mes vacío y limpia', async () => {
    render(<AdminCampanasPage />);

    expect(await screen.findByText('Mostrando 4 de 4 jornadas', {}, { timeout: 2000 })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Año' }));
    const anios = screen.getByRole('listbox', { name: 'Año' });
    expect(anios.textContent).toContain('Todos los años');
    expect(anios.textContent).toContain('2025');
    expect(anios.textContent).toContain('2024');
    fireEvent.click(screen.getByRole('option', { name: '2024' }));

    expect(screen.getByRole('button', { name: 'Año: 2024' })).toBeTruthy();
    expect(screen.getByText('Mostrando 3 de 4 jornadas · 2024')).toBeTruthy();
    expect(screen.getByText('Total de 2024')).toBeTruthy();
    expect(screen.queryByText('Jornada Villa Adela')).toBeNull();
    expect(screen.getByText('234')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mes' }));
    const enero = screen.getByRole('option', { name: 'Ene' });
    expect(enero.className).toContain('text-placeholder');
    fireEvent.click(enero);

    expect(screen.getByText('Todavía no hay registros.')).toBeTruthy();
    expect(screen.getByText('Mostrando 0 de 4 jornadas · Enero 2024')).toBeTruthy();
    expect(screen.getByText('Total de enero 2024')).toBeTruthy();
    expect(screen.getByText('Selecciona una campaña…')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Mostrando 4 de 4 jornadas')).toBeTruthy();
    expect(screen.getByText('Total acumulado')).toBeTruthy();
    expect(screen.getByText('310')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();
  });
});
