import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminAnimalesPage } from '@/pages/admin/AdminAnimalesPage';
import { AdminCampanasPage } from '@/pages/admin/AdminCampanasPage';
import { listAnimales } from '@/services/admin/animales.service';
import { listCampanas } from '@/services/admin/campanas.service';
import type { Animal, CampanaConTotales, PaginaCampanas } from '@/types/admin';

// La paginación y los filtros los resuelve el backend: aquí se simula su respuesta.
vi.mock('@/services/admin/campanas.service', () => ({
  listCampanas: vi.fn(),
  subirFotosCampana: vi.fn(),
}));
vi.mock('@/services/admin/animales.service', () => ({
  listAnimales: vi.fn(),
  quitarFotoAnimal: vi.fn(),
  subirFotoAnimal: vi.fn(),
}));

const TOTAL = 23;

function campana(indice: number): CampanaConTotales {
  return {
    id: `c${indice}`,
    titulo: `Jornada ${indice}`,
    lugar: null,
    fecha: '2026-03-10',
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

function animal(indice: number): Animal {
  return {
    id: `a${indice}`,
    nombre: `Animal ${indice}`,
    especie: 'perro',
    sexo: 'macho',
    edad: null,
    fechaIngreso: null,
    fotoIngreso: null,
    adoptadoPor: null,
    direccionAdoptante: null,
    fotoAdopcion: null,
    fechaAdopcion: null,
  };
}

function rango(pagina: number) {
  const desde = (pagina - 1) * 10;
  const hasta = Math.min(desde + 10, TOTAL);
  return Array.from({ length: hasta - desde }, (_, i) => desde + i + 1);
}

beforeEach(() => {
  vi.mocked(listCampanas).mockImplementation(async ({ pagina = 1 } = {}) => {
    const respuesta: PaginaCampanas = {
      items: rango(pagina).map(campana),
      total: TOTAL,
      pagina,
      limite: 10,
      totalPaginas: 3,
      contadores: { perrosMachos: TOTAL, perrosHembras: 0, gatosMachos: 0, gatosHembras: 0 },
      totales: { perros: TOTAL, gatos: 0, machos: TOTAL, hembras: 0, total: TOTAL },
      anios: [2026],
      meses: [3],
    };
    return respuesta;
  });
  vi.mocked(listAnimales).mockImplementation(async ({ pagina = 1 } = {}) => ({
    items: rango(pagina).map(animal),
    total: TOTAL,
    pagina,
    limite: 10,
    totalPaginas: 3,
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('paginación del panel', () => {
  it('campañas: pide cada página al backend y muestra el rango y el total del filtro', async () => {
    render(<AdminCampanasPage />);

    expect(await screen.findByText('Mostrando 1–10 de 23 jornadas')).toBeTruthy();
    expect(screen.getByText('Página 1 de 3')).toBeTruthy();
    expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 1, limite: 10 }),
    );
    expect(screen.getByText('23 jornadas')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Anterior/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Mostrando 11–20 de 23 jornadas')).toBeTruthy();
    expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 2 }),
    );

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Mostrando 21–23 de 23 jornadas')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Siguiente/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('campañas: al cambiar el filtro vuelve a la página 1 y lo envía al backend', async () => {
    render(<AdminCampanasPage />);
    await screen.findByText('Mostrando 1–10 de 23 jornadas');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    await screen.findByText('Mostrando 11–20 de 23 jornadas');

    fireEvent.click(screen.getByRole('button', { name: 'Año' }));
    fireEvent.click(screen.getByRole('option', { name: '2026' }));

    await waitFor(() =>
      expect(vi.mocked(listCampanas)).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, anio: 2026 }),
      ),
    );
    expect(await screen.findByText('Mostrando 1–10 de 23 jornadas · 2026')).toBeTruthy();
  });

  it('animales: pide cada página al backend y el filtro reinicia la página', async () => {
    render(<AdminAnimalesPage />);

    expect(await screen.findByText('Mostrando 1–10 de 23 animales')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Mostrando 11–20 de 23 animales')).toBeTruthy();
    expect(vi.mocked(listAnimales)).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 2, filtro: 'todos', limite: 10 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Adoptados' }));
    await waitFor(() =>
      expect(vi.mocked(listAnimales)).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagina: 1, filtro: 'adoptados' }),
      ),
    );
    expect(await screen.findByText('Mostrando 1–10 de 23 animales')).toBeTruthy();
  });

  it('no muestra la paginación cuando todo cabe en una página', async () => {
    vi.mocked(listAnimales).mockResolvedValue({
      items: [animal(1)],
      total: 1,
      pagina: 1,
      limite: 10,
      totalPaginas: 1,
    });
    render(<AdminAnimalesPage />);

    expect(await screen.findByText('Mostrando 1–1 de 1 animales')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
  });
});
