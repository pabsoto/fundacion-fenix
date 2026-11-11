import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminAnimalesPage } from '@/pages/admin/AdminAnimalesPage';

// DEMO: estas pruebas usan los datos simulados del panel.
vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

afterEach(() => {
  cleanup();
});

function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

describe('AdminAnimalesPage', () => {
  it('selecciona a Max, filtra en el cliente y abre el registro', async () => {
    render(<AdminAnimalesPage />);

    const seleccionada = await screen.findByRole(
      'row',
      { selected: true },
      { timeout: 2000 },
    );
    expect(seleccionada.textContent).toContain('Max');
    expect(screen.getByText('Mostrando 8 de 8 animales')).toBeTruthy();
    expect(screen.getByText('12 mar 2025')).toBeTruthy();
    expect(screen.getByText('En su adopción')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'En la fundación' }));
    expect(screen.getByText('Mostrando 4 de 8 animales')).toBeTruthy();
    const detalle = screen.getByRole('complementary');
    expect(detalle.textContent).toContain('Apolo');
    expect(detalle.textContent).toContain('Al ingresar');
    expect(detalle.textContent).not.toContain('En su adopción');
    expect(detalle.textContent).not.toContain('Adoptado por');
    expect(detalle.textContent).not.toContain('Dirección');

    fireEvent.click(screen.getByRole('button', { name: '+ Registrar animal' }));
    const dialog = screen.getByRole('dialog', { name: 'Registrar animal' });
    expect(dialog).toBeTruthy();
    const fecha = screen.getByLabelText('Fecha de ingreso (opcional)') as HTMLInputElement;
    expect(fecha.value).toBe(hoy());
    const interruptor = screen.getByRole('switch', { name: /¿Ya fue adoptado\?/ });
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Nombre de quien lo adoptó *')).toBeTruthy();

    fireEvent.click(interruptor);
    expect(interruptor.getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByLabelText('Nombre de quien lo adoptó *')).toBeNull();
    expect(screen.queryByLabelText('Dirección (opcional)')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro' }));
    expect(screen.getByRole('dialog', { name: 'Editar animal' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar animal' }));
    expect(screen.getByRole('dialog', { name: 'Eliminar animal' })).toBeTruthy();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull();
  });
});
