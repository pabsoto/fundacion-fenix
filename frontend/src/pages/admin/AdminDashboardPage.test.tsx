import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  AuthApiError,
  cerrarSesion,
  consultarEstadoAdministrativo,
  consultarSesion,
} from '../../services/auth.service';
import { AdminDashboardPage } from './AdminDashboardPage';

vi.mock('@/components/admin/AdminDonationPanel', () => ({
  AdminDonationPanel: ({ csrfToken }: { csrfToken: string }) => (
    <div data-testid="donation-panel">{csrfToken}</div>
  ),
}));

vi.mock('@/services/auth.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/auth.service')>();

  return {
    ...actual,
    cerrarSesion: vi.fn(),
    consultarEstadoAdministrativo: vi.fn(),
    consultarSesion: vi.fn(),
  };
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/login" element={<p>Ruta de inicio de sesión</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const sesion = {
  autenticado: true as const,
  administrador: { id: 'admin-1', nombre: 'Administración FÉNIX' },
  csrfToken: 'csrf-token',
  expiraEn: '2026-10-22T15:30:00.000Z',
};

const estado = {
  status: 'ok' as const,
  administrador: sesion.administrador,
  timestamp: '2026-10-22T15:30:00.000Z',
};

beforeEach(() => {
  vi.mocked(consultarSesion).mockResolvedValue(sesion);
  vi.mocked(consultarEstadoAdministrativo).mockResolvedValue(estado);
  vi.mocked(cerrarSesion).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminDashboardPage', () => {
  it('no muestra datos privados hasta confirmar la sesión y la autorización', async () => {
    const respuestaSesion = deferred<typeof sesion>();
    const respuestaAutorizacion = deferred<typeof estado>();
    vi.mocked(consultarSesion).mockReturnValue(respuestaSesion.promise);
    vi.mocked(consultarEstadoAdministrativo).mockReturnValue(
      respuestaAutorizacion.promise,
    );

    renderDashboard();

    expect(
      screen.getByText('Comprobando acceso administrativo…'),
    ).toBeTruthy();
    expect(screen.queryByTestId('donation-panel')).toBeNull();

    await act(async () => respuestaSesion.resolve(sesion));
    await waitFor(() =>
      expect(consultarEstadoAdministrativo).toHaveBeenCalledOnce(),
    );
    expect(screen.queryByTestId('donation-panel')).toBeNull();

    await act(async () => respuestaAutorizacion.resolve(estado));
    const panelDonaciones = await screen.findByTestId('donation-panel');
    expect(panelDonaciones.textContent).toBe(sesion.csrfToken);
  });

  it('redirige al login sin mostrar datos privados cuando no hay sesión', async () => {
    vi.mocked(consultarSesion).mockRejectedValue(
      new AuthApiError(401, 'No hay una sesión activa'),
    );

    renderDashboard();

    expect(await screen.findByText('Ruta de inicio de sesión')).toBeTruthy();
    expect(screen.queryByTestId('donation-panel')).toBeNull();
  });

  it('bloquea el panel si la cuenta administrativa no está autorizada', async () => {
    vi.mocked(consultarEstadoAdministrativo).mockRejectedValue(
      new AuthApiError(403, 'Cuenta desactivada'),
    );

    renderDashboard();

    expect(
      await screen.findByText(
        'Acceso denegado: la cuenta administrativa está desactivada.',
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId('donation-panel')).toBeNull();
  });

  it('cierra la sesión usando el token CSRF y vuelve al login', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() =>
      expect(cerrarSesion).toHaveBeenCalledWith(sesion.csrfToken),
    );
    expect(await screen.findByText('Ruta de inicio de sesión')).toBeTruthy();
  });
});
