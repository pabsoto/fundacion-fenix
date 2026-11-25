import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AdminAnimalesPage } from '@/pages/admin/AdminAnimalesPage';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';
import { listAnimales } from '@/services/admin/animales.service';
import { listCampanas } from '@/services/admin/campanas.service';
import { CLAVE_FILTROS_CAMPANAS } from '@/lib/filtros-url-admin';
import type { CampanaConTotales, PaginaCampanas } from '@/types/admin';

vi.mock('@/services/admin/campanas.service', () => ({
  listCampanas: vi.fn(),
  subirFotosCampana: vi.fn(),
}));
vi.mock('@/services/admin/animales.service', () => ({
  listAnimales: vi.fn(),
  quitarFotoAnimal: vi.fn(),
  subirFotoAnimal: vi.fn(),
}));

function campana(indice: number): CampanaConTotales {
  return {
    id: `c${indice}`,
    titulo: `Jornada ${indice}`,
    lugar: 'Miraflores',
    fecha: '2025-03-08',
    descripcion: null,
    fotos: [],
    fotoIds: [],
    estado: 'publicada',
    perrosMachos: 1,
    perrosHembras: 0,
    gatosMachos: 0,
    gatosHembras: 0,
    totales: { perros: 1, gatos: 0, machos: 1, hembras: 0, total: 1 },
    editable: true,
  };
}

function paginaCampanas(pagina: number): PaginaCampanas {
  const total = 23;
  const desde = (pagina - 1) * 10;
  const cantidad = Math.max(0, Math.min(10, total - desde));
  return {
    items: Array.from({ length: cantidad }, (_, i) => campana(desde + i + 1)),
    total,
    pagina,
    limite: 10,
    totalPaginas: 3,
    contadores: { perrosMachos: total, perrosHembras: 0, gatosMachos: 0, gatosHembras: 0 },
    totales: { perros: total, gatos: 0, machos: total, hembras: 0, total },
    anios: [2026, 2025],
    meses: [3, 6],
  };
}

beforeEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.mocked(listCampanas).mockImplementation(async (consulta = {}) => {
    const pagina = consulta.pagina ?? 1;
    return paginaCampanas(pagina > 3 ? 1 : pagina);
  });
  vi.mocked(listAnimales).mockImplementation(async (consulta = {}) => ({
    items: [
      {
        id: 'a1',
        nombre: 'Mishi',
        especie: 'gato',
        sexo: 'hembra',
        edad: null,
        fechaIngreso: null,
        fotoIngreso: null,
        adoptadoPor: null,
        direccionAdoptante: null,
        fechaAdopcion: null,
        fotoAdopcion: null,
      },
    ],
    total: 1,
    pagina: consulta.pagina ?? 1,
    limite: 10,
    totalPaginas: 1,
  }));
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

function montarCampanas(entrada: string) {
  const router = createMemoryRouter([{ path: '/admin/campanas', element: <AdminCampanasPage /> }], {
    initialEntries: [entrada],
  });
  const vista = render(<RouterProvider router={router} />);
  return { router, ...vista };
}

function montarAnimales(entrada: string) {
  const router = createMemoryRouter([{ path: '/admin/animales', element: <AdminAnimalesPage /> }], {
    initialEntries: [entrada],
  });
  const vista = render(<RouterProvider router={router} />);
  return { router, ...vista };
}

describe('filtros del panel en la URL', () => {
  it('aplica una URL válida y la envía en la petición', async () => {
    montarCampanas('/admin/campanas?anio=2025&mes=3&pagina=2&q=miraflores');

    expect(await screen.findByText('Mostrando 11–20 de 23 jornadas · Marzo 2025')).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre o lugar' })).toHaveProperty(
      'value',
      'miraflores',
    );
    expect(vi.mocked(listCampanas)).toHaveBeenCalledWith(
      expect.objectContaining({ anio: 2025, mes: 3, pagina: 2, q: 'miraflores' }),
      expect.anything(),
    );
  });

  it('ignora año, mes, página y filtro inválidos', async () => {
    const { router } = montarCampanas('/admin/campanas?anio=abc&mes=13&pagina=-2');
    await screen.findByText('Mostrando 1–10 de 23 jornadas');
    expect(vi.mocked(listCampanas)).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 1 }),
      expect.anything(),
    );
    const consulta = vi.mocked(listCampanas).mock.calls.at(-1)?.[0];
    expect(consulta?.anio).toBeUndefined();
    expect(consulta?.mes).toBeUndefined();
    await waitFor(() => expect(router.state.location.search).toBe(''));

    cleanup();
    sessionStorage.clear();
    vi.mocked(listAnimales).mockClear();
    montarAnimales('/admin/animales?filtro=xyz&pagina=-2');
    await screen.findByText('Mostrando 1–1 de 1 animales');
    expect(vi.mocked(listAnimales)).toHaveBeenCalledWith(
      expect.objectContaining({ filtro: 'todos', pagina: 1 }),
      expect.anything(),
    );
  });

  it('cambiar el año actualiza la URL y vuelve a la página 1', async () => {
    const { router } = montarCampanas('/admin/campanas?pagina=2');
    await screen.findByText('Mostrando 11–20 de 23 jornadas');

    fireEvent.click(screen.getByRole('button', { name: 'Año' }));
    fireEvent.click(screen.getByRole('option', { name: '2025' }));

    await waitFor(() => expect(router.state.location.search).toBe('?anio=2025'));
    expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
      expect.objectContaining({ anio: 2025, pagina: 1 }),
      expect.anything(),
    );

    await router.navigate(-1);
    expect(router.state.location.search).toBe('?pagina=2');
  });

  it('al montar de nuevo con la misma URL conserva los filtros', async () => {
    const primera = montarCampanas('/admin/campanas?anio=2025&q=miraflores');
    await screen.findByText('Mostrando 1–10 de 23 jornadas · 2025');
    primera.unmount();

    montarCampanas('/admin/campanas?anio=2025&q=miraflores');
    expect(await screen.findByText('Mostrando 1–10 de 23 jornadas · 2025')).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: 'Buscar por nombre o lugar' })).toHaveProperty(
      'value',
      'miraflores',
    );
    expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
      expect.objectContaining({ anio: 2025, q: 'miraflores', pagina: 1 }),
      expect.anything(),
    );
  });

  it('escribe q en la URL con replace después del debounce', async () => {
    const { router } = montarCampanas('/admin/campanas?pagina=2');
    await screen.findByText('Mostrando 11–20 de 23 jornadas');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar por nombre o lugar' }), {
      target: { value: 'alto' },
    });

    await waitFor(() => expect(router.state.location.search).toBe('?q=alto'), { timeout: 3000 });
    await waitFor(() =>
      expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'alto', pagina: 1 }),
        expect.anything(),
      ),
    );
    await router.navigate(-1);
    expect(router.state.location.search).toBe('?q=alto');
  });

  it('recupera los filtros de la sesión al volver a la pestaña sin parámetros', async () => {
    sessionStorage.setItem(CLAVE_FILTROS_CAMPANAS, 'anio=2025&mes=6');
    montarCampanas('/admin/campanas');

    await waitFor(() =>
      expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
        expect.objectContaining({ anio: 2025, mes: 6, pagina: 1 }),
        expect.anything(),
      ),
    );
  });
});
