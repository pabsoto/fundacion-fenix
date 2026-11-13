import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SelectFiltro } from '@/components/admin/ui/SelectFiltro';

afterEach(() => {
  cleanup();
});

function Harness({ cuadricula = false, movil = false }: { cuadricula?: boolean; movil?: boolean }) {
  const [valor, setValor] = useState<string | null>(null);
  const opciones = cuadricula
    ? [
        { valor: '1', etiqueta: 'Ene', atenuada: true },
        { valor: '2', etiqueta: 'Feb' },
      ]
    : [
        { valor: '2025', etiqueta: '2025' },
        { valor: '2024', etiqueta: '2024' },
      ];
  return (
    <div>
      <SelectFiltro
        id="filtro-prueba"
        etiqueta="Año"
        valor={valor}
        textoValor={valor}
        todosEtiqueta={cuadricula ? 'Todos los meses' : 'Todos los años'}
        opciones={opciones}
        disposicion={cuadricula ? 'cuadricula' : 'lista'}
        movil={movil}
        onCambio={setValor}
      />
      <button type="button">Afuera</button>
    </div>
  );
}

describe('SelectFiltro', () => {
  it('elige con el teclado y devuelve el foco al chip', () => {
    render(<Harness />);
    const chip = screen.getByRole('button', { name: 'Año' });
    chip.focus();
    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    expect(chip.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(chip, { key: 'ArrowDown' });
    fireEvent.keyDown(chip, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Año: 2025' })).toBeTruthy();
    expect(chip.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Año: 2025' }));
  });

  it('cierra con Escape y con un clic afuera', () => {
    render(<Harness />);
    const chip = screen.getByRole('button', { name: 'Año' });
    fireEvent.click(chip);
    expect(screen.getByRole('listbox', { name: 'Año' })).toBeTruthy();
    fireEvent.keyDown(chip, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(chip);

    fireEvent.click(chip);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Afuera' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('en una ventana estrecha deja el menú de meses completo dentro del ancho', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect(this: HTMLElement) {
      if (this.id === 'filtro-prueba') {
        return new DOMRect(140, 80, 80, 44);
      }
      return new DOMRect(0, 0, 288, 240);
    });

    render(<Harness cuadricula movil />);
    fireEvent.click(screen.getByRole('button', { name: 'Año' }));

    const menu = screen.getByRole('listbox', { name: 'Año' });
    expect(menu.parentElement).toBe(document.body);
    const izquierda = Number.parseFloat(menu.style.left);
    const ancho = Number.parseFloat(menu.style.width);
    expect(izquierda).toBeGreaterThanOrEqual(16);
    expect(izquierda + ancho).toBeLessThanOrEqual(360 - 16);
  });

  it('permite elegir una opción atenuada de la cuadrícula', () => {
    render(<Harness cuadricula />);
    fireEvent.click(screen.getByRole('button', { name: 'Año' }));
    fireEvent.click(screen.getByRole('option', { name: 'Ene' }));
    expect(screen.getByRole('button', { name: 'Año: 1' })).toBeTruthy();
  });
});
