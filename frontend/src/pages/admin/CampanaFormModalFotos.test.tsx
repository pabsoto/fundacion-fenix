import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CampanaFormModal } from '@/pages/admin/CampanaFormModal';
import { fijarCsrfAdmin } from '@/services/admin/cliente-admin';
import type { CampanaConTotales } from '@/types/admin';

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: false }));

const fetchMock = vi.fn();

const campana: CampanaConTotales = {
  id: 'c1',
  titulo: 'Jornada Sur',
  lugar: 'Zona Sur',
  fecha: '2026-03-10',
  descripcion: null,
  estado: 'publicada',
  perrosMachos: 1,
  perrosHembras: 2,
  gatosMachos: 3,
  gatosHembras: 4,
  fotos: ['https://fotos/1.webp', 'https://fotos/2.webp'],
  fotoIds: ['f1', 'f2'],
  totales: { perros: 3, gatos: 7, machos: 4, hembras: 6, total: 10 },
  editable: true,
};

const respuestaApi = {
  id: 'c1',
  tituloEs: 'Jornada Sur',
  descripcionEs: null,
  lugar: 'Zona Sur',
  fecha: '2026-03-10',
  estado: 'publicada',
  perrosMachos: 1,
  perrosHembras: 2,
  gatosMachos: 3,
  gatosHembras: 4,
  totales: campana.totales,
  fotos: [{ id: 'f2', url: 'https://fotos/2.webp', orden: 2 }],
};

function metodos(): string[] {
  return fetchMock.mock.calls.map(
    ([url, init]) => `${(init as RequestInit).method} ${String(url).replace(/^.*\/api/, '')}`,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fijarCsrfAdmin('token-csrf');
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('CampanaFormModal quitando fotos con la API real', () => {
  it('guarda y quita del servidor solo la foto que se retiró', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(respuestaApi), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
    );
    const alGuardar = vi.fn();
    render(<CampanaFormModal campana={campana} onCerrar={() => undefined} onGuardada={alGuardar} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar foto' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(alGuardar).toHaveBeenCalledWith('c1', null));
    expect(metodos()).toEqual(['PUT /admin/campanas/c1', 'DELETE /admin/campanas/c1/fotos/f1']);
  });

  it('avisa sin cerrar si una foto no se pudo quitar', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? new Response(JSON.stringify({ message: 'caído' }), { status: 503 })
        : new Response(JSON.stringify(respuestaApi), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
    );
    const alGuardar = vi.fn();
    render(<CampanaFormModal campana={campana} onCerrar={() => undefined} onGuardada={alGuardar} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar foto' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('una foto no se pudo quitar'),
    );
    expect(alGuardar).not.toHaveBeenCalled();
  });

  it('no llama a DELETE si no se retiró ninguna foto', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(respuestaApi), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const alGuardar = vi.fn();
    render(<CampanaFormModal campana={campana} onCerrar={() => undefined} onGuardada={alGuardar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(alGuardar).toHaveBeenCalled());
    expect(metodos()).toEqual(['PUT /admin/campanas/c1']);
  });
});
