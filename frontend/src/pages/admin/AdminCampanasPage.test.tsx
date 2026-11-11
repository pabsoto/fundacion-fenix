import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';

afterEach(() => {
  cleanup();
});

describe('AdminCampanasPage', () => {
  it('filtra por año y mes y vuelve a todas al limpiar', async () => {
    render(<AdminCampanasPage />);

    expect(await screen.findByText('Mostrando 4 de 4 jornadas', {}, { timeout: 2000 })).toBeTruthy();
    const anio = screen.getByLabelText('Año') as HTMLSelectElement;
    expect([...anio.options].map((opcion) => opcion.value)).toEqual(['', '2025', '2024']);

    fireEvent.change(anio, { target: { value: '2024' } });
    expect(screen.getByText('Mostrando 3 de 4 jornadas')).toBeTruthy();
    expect(screen.queryByText('Jornada Villa Adela')).toBeNull();
    expect(screen.getByText('234')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '1' } });
    expect(screen.getByText('Todavía no hay registros.')).toBeTruthy();
    expect(screen.getByText('Mostrando 0 de 4 jornadas')).toBeTruthy();
    expect(screen.getByText('Total acumulado').closest('[role="row"]')?.textContent).toContain('0');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByText('Mostrando 4 de 4 jornadas')).toBeTruthy();
    expect(screen.getByText('310')).toBeTruthy();
    expect((screen.getByLabelText('Año') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Mes') as HTMLSelectElement).value).toBe('');
  });
});
