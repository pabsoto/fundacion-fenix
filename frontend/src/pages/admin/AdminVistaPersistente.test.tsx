import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminAnimalesPage } from '@/pages/admin/AdminAnimalesPage';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';
import * as servicioAnimales from '@/services/admin/animales.service';
import * as servicioCampanas from '@/services/admin/campanas.service';

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

const vista = vi.hoisted(() => ({ movil: false }));
vi.mock('@/hooks/useVistaMovil', () => ({
  useVistaMovil: () => vista.movil,
}));

const TITULOS = [
  'Jornada Villa Adela',
  'Jornada Distrito 4',
  'Jornada Obrajes',
  'Jornada Ciudad Satélite',
];

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vista.movil = false;
  vi.restoreAllMocks();
});

function pagina(entrada: string, elemento: ReactNode) {
  return (
    <MemoryRouter initialEntries={[entrada]}>
      {elemento}
    </MemoryRouter>
  );
}

describe('el panel conserva el estado al cruzar 768 px', () => {
  it('conserva la campaña, el texto del modal y no vuelve a listar', async () => {
    vista.movil = false;
    const listar = vi.spyOn(servicioCampanas, 'listCampanas');
    const ui = render(pagina('/admin/campanas', <AdminCampanasPage />));

    const fila = await screen.findByRole('row', { selected: true }, { timeout: 2000 });
    const titulo = TITULOS.find((nombre) => fila.textContent?.includes(nombre));
    expect(titulo).toBeTruthy();
    const llamadas = listar.mock.calls.length;
    expect(llamadas).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Editar jornada' }));
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Texto que no se pierde' } });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar por nombre o lugar' }), {
      target: { value: 'satelite' },
    });

    vista.movil = true;
    ui.rerender(pagina('/admin/campanas', <AdminCampanasPage />));
    expect(listar.mock.calls.length).toBe(llamadas);
    expect(screen.getByLabelText('Título *')).toHaveProperty('value', 'Texto que no se pierde');
    expect(screen.getByRole('button', { expanded: true }).textContent).toContain(titulo);
    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre o lugar' })).toHaveProperty(
      'value',
      'satelite',
    );

    vista.movil = false;
    ui.rerender(pagina('/admin/campanas', <AdminCampanasPage />));
    expect(listar.mock.calls.length).toBe(llamadas);
    expect(screen.getByRole('row', { selected: true }).textContent).toContain(titulo);
    expect(screen.getByLabelText('Título *')).toHaveProperty('value', 'Texto que no se pierde');
    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre o lugar' })).toHaveProperty(
      'value',
      'satelite',
    );
  }, 15000);

  it('conserva el animal, el texto del modal y no vuelve a listar', async () => {
    vista.movil = false;
    const listar = vi.spyOn(servicioAnimales, 'listAnimales');
    const ui = render(pagina('/admin/animales', <AdminAnimalesPage />));

    const fila = await screen.findByRole('row', { selected: true }, { timeout: 2000 });
    expect(fila.textContent).toContain('Max');
    const llamadas = listar.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Editar registro' }));
    fireEvent.change(screen.getByLabelText('Nombre del animal *'), { target: { value: 'Max editado' } });

    vista.movil = true;
    ui.rerender(pagina('/admin/animales', <AdminAnimalesPage />));
    expect(listar.mock.calls.length).toBe(llamadas);
    expect(screen.getByLabelText('Nombre del animal *')).toHaveProperty('value', 'Max editado');
    expect(screen.getByRole('button', { expanded: true }).textContent).toContain('Max');

    vista.movil = false;
    ui.rerender(pagina('/admin/animales', <AdminAnimalesPage />));
    expect(listar.mock.calls.length).toBe(llamadas);
    expect(screen.getByRole('row', { selected: true }).textContent).toContain('Max');
    expect(screen.getByLabelText('Nombre del animal *')).toHaveProperty('value', 'Max editado');
  }, 15000);
});
