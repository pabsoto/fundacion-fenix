import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthApiError,
  cerrarSesion,
  consultarEstadoAdministrativo,
  consultarSesion,
  type EstadoAdministrativo,
  type SesionActual,
} from '@/services/auth.service';

function mensajeError(cause: unknown): string {
  if (cause instanceof AuthApiError) {
    if (cause.status === 403) {
      return 'Acceso denegado: la cuenta administrativa está desactivada.';
    }
    if (cause.status === 503) {
      return 'El servicio no está disponible. Inténtalo más tarde.';
    }
  }

  return 'No se pudo comprobar el acceso administrativo.';
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionActual | null>(null);
  const [estado, setEstado] = useState<EstadoAdministrativo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function comprobarAcceso() {
      try {
        const sesionActual = await consultarSesion(controller.signal);
        const estadoActual = await consultarEstadoAdministrativo(
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setSesion(sesionActual);
          setEstado(estadoActual);
        }
      } catch (cause: unknown) {
        if (controller.signal.aborted) return;

        if (cause instanceof AuthApiError && cause.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }

        setError(mensajeError(cause));
      }
    }

    void comprobarAcceso();
    return () => controller.abort();
  }, [navigate]);

  async function manejarLogout() {
    if (!sesion) return;

    setCerrando(true);
    setError(null);

    try {
      await cerrarSesion(sesion.csrfToken);
      navigate('/admin/login', { replace: true });
    } catch (cause: unknown) {
      if (cause instanceof AuthApiError && cause.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }

      if (cause instanceof AuthApiError && cause.status === 403) {
        setError('No se pudo cerrar sesión: token CSRF inválido.');
      } else if (cause instanceof AuthApiError && cause.status === 503) {
        setError('No se pudo cerrar sesión: servicio no disponible.');
      } else {
        setError('No se pudo cerrar la sesión.');
      }
      setCerrando(false);
    }
  }

  if (error && (!sesion || !estado)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-crema px-6 py-12">
        <section className="w-full max-w-lg rounded-card border border-linea bg-blanco p-8 text-center shadow-soft">
          <h1 className="t-heading-lg">Panel de administración</h1>
          <p className="t-body mt-6 text-red-700" role="alert">
            {error}
          </p>
        </section>
      </main>
    );
  }

  if (!sesion || !estado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-crema px-6 py-12">
        <p className="t-body" role="status">
          Comprobando acceso administrativo…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-crema px-6 py-12">
      <section className="mx-auto w-full max-w-2xl rounded-card border border-linea bg-blanco p-8 shadow-soft">
        <h1 className="t-heading-lg">Panel de administración</h1>
        <dl className="t-body mt-8 grid gap-4">
          <div>
            <dt className="font-semibold">Administrador</dt>
            <dd>{sesion.administrador.nombre}</dd>
          </div>
          <div>
            <dt className="font-semibold">Estado de la sesión</dt>
            <dd>{sesion.autenticado ? 'Autenticada' : 'No autenticada'}</dd>
          </div>
          <div>
            <dt className="font-semibold">Endpoint administrativo</dt>
            <dd>
              /api/admin/health: {estado.status === 'ok' ? '200 OK' : estado.status}
            </dd>
          </div>
        </dl>

        {error && (
          <p className="t-small mt-6 text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          className="t-button mt-8 cursor-pointer rounded-btn border border-negro px-5 py-3 hover:bg-crema-tono disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={cerrando}
          onClick={() => void manejarLogout()}
        >
          {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  );
}
