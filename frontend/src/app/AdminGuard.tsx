import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { textosAdmin } from '@/content/textos-admin';
import { AdminSesionProvider } from '@/app/admin-sesion';
import { fijarCsrfAdmin } from '@/services/admin/cliente-admin';
import {
  AuthApiError,
  consultarEstadoAdministrativo,
  consultarSesion,
  type SesionActual,
} from '@/services/auth.service';

function mensajeError(cause: unknown): string {
  if (cause instanceof AuthApiError) {
    if (cause.status === 403) return textosAdmin.supuestos.denegado;
    if (cause.status === 503) return textosAdmin.supuestos.noDisponible;
  }

  return textosAdmin.supuestos.noComprobado;
}

/** Comprueba la sesión con las mismas llamadas que el panel demo. */
export function AdminGuard() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionActual | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function comprobarAcceso() {
      try {
        const sesionActual = await consultarSesion(controller.signal);
        await consultarEstadoAdministrativo(controller.signal);

        if (!controller.signal.aborted) {
          fijarCsrfAdmin(sesionActual.csrfToken);
          setSesion(sesionActual);
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

  if (error && !sesion) {
    return (
      <main className="bg-crema flex min-h-dvh items-center justify-center px-(--spacing-pagina-admin-compacto) py-12">
        <section className="rounded-admin border-linea bg-blanco shadow-panel-admin w-full max-w-lg border p-8 text-center">
          <h1 className="t-heading-lg">{textosAdmin.supuestos.tituloAcceso}</h1>
          <p className="t-body mt-6 text-red-700" role="alert">
            {error}
          </p>
        </section>
      </main>
    );
  }

  if (!sesion) {
    return (
      <main className="bg-crema flex min-h-dvh items-center justify-center px-(--spacing-pagina-admin-compacto) py-12">
        <p className="t-body" role="status">
          {textosAdmin.supuestos.comprobando}
        </p>
      </main>
    );
  }

  return (
    <AdminSesionProvider value={sesion}>
      <Outlet />
    </AdminSesionProvider>
  );
}
