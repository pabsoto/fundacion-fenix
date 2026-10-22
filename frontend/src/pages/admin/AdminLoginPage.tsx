import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthApiError,
  consultarSesion,
  iniciarLogin,
} from '@/services/auth.service';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [comprobando, setComprobando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puedeIniciarSesion, setPuedeIniciarSesion] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    consultarSesion(controller.signal)
      .then(() => navigate('/admin', { replace: true }))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        if (cause instanceof AuthApiError && cause.status === 401) {
          setPuedeIniciarSesion(true);
          setComprobando(false);
          return;
        }

        if (cause instanceof AuthApiError && cause.status === 403) {
          setError('La cuenta administrativa está desactivada.');
        } else if (cause instanceof AuthApiError && cause.status === 503) {
          setError('El servicio no está disponible. Inténtalo más tarde.');
        } else {
          setError('No se pudo comprobar la sesión administrativa.');
        }
        setComprobando(false);
      });

    return () => controller.abort();
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-crema px-6 py-12">
      <section className="w-full max-w-md rounded-card border border-linea bg-blanco p-8 text-center shadow-soft">
        <h1 className="t-heading-lg">Fundación FÉNIX</h1>
        <p className="t-body mt-2">Acceso administrativo</p>

        {comprobando ? (
          <p className="t-small mt-8" role="status">
            Comprobando sesión…
          </p>
        ) : (
          <>
            {error && (
              <p className="t-small mt-6 text-red-700" role="alert">
                {error}
              </p>
            )}
            {puedeIniciarSesion && (
              <button
                className="t-button mt-8 w-full cursor-pointer rounded-btn bg-negro px-5 py-3 text-blanco hover:bg-naranja focus-visible:outline-negro"
                type="button"
                onClick={iniciarLogin}
              >
                Continuar con Google
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
