import { useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { FlameIcon } from '@/components/ui/icons';
import { useAdminSesion } from '@/app/admin-sesion';
import { cn } from '@/lib/cn';
import { AuthApiError, cerrarSesion } from '@/services/auth.service';

const PESTANAS = [
  { to: '/admin', end: true, label: textosAdmin.nav.resumen },
  { to: '/admin/campanas', end: false, label: textosAdmin.nav.campanas },
  { to: '/admin/animales', end: false, label: textosAdmin.nav.animales },
  { to: '/admin/donaciones', end: false, label: textosAdmin.nav.donaciones },
] as const;

function inicialDe(nombre: string): string {
  const letra = Array.from(nombre.trim())[0];
  return letra ? letra.toLocaleUpperCase('es') : '';
}

function mensajeLogout(cause: unknown): string {
  if (cause instanceof AuthApiError && cause.status === 403) {
    return textosAdmin.supuestos.csrf;
  }
  if (cause instanceof AuthApiError && cause.status === 503) {
    return textosAdmin.supuestos.logoutNoDisponible;
  }
  return textosAdmin.supuestos.logoutError;
}

function Pestanas({ amplia = false, onNavegar }: { amplia?: boolean; onNavegar?: () => void }) {
  return (
    <>
      {PESTANAS.map((pestana) => (
        <NavLink
          key={pestana.to}
          to={pestana.to}
          end={pestana.end}
          onClick={onNavegar}
          className={({ isActive }) =>
            cn(
              'rounded-pill t-nav text-negro inline-flex items-center px-(--spacing-tab-x-admin) py-(--spacing-tab-y-admin)',
              amplia && 'min-h-(--size-toque-admin)',
              isActive ? 'bg-amarillo' : 'hover:bg-crema-tono',
            )
          }
        >
          {pestana.label}
        </NavLink>
      ))}
    </>
  );
}

export function AdminDashboardPage() {
  const sesion = useAdminSesion();
  const navigate = useNavigate();
  const menuId = useId();
  const nombre = sesion.administrador.nombre;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuAbierto) return;

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAbierto(false);
    }

    document.addEventListener('keydown', cerrarConEscape);
    return () => document.removeEventListener('keydown', cerrarConEscape);
  }, [menuAbierto]);

  async function manejarLogout() {
    if (cerrando) return;

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

      setError(mensajeLogout(cause));
      setCerrando(false);
    }
  }

  return (
    <div className="bg-crema text-negro flex min-h-dvh flex-col overflow-x-clip">
      <header className="border-linea border-b">
        <div className="escritorio:grid-cols-[1fr_auto_1fr] escritorio:px-(--spacing-pagina-admin) grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-(--spacing-pagina-admin-compacto) py-(--spacing-nav-admin)">
          <Link
            to="/admin"
            className="flex w-fit shrink-0 items-center gap-(--spacing-marca-admin) justify-self-start no-underline"
          >
            <span className="rounded-pill bg-amarillo flex size-(--size-marca-admin) shrink-0 items-center justify-center">
              <FlameIcon className="size-(--size-icono-marca-admin)" />
            </span>
            <span className="text-negro whitespace-nowrap">
              <span className="t-marca block">{textosAdmin.marca.nombre}</span>
              <span className="t-marca-sub block">{textosAdmin.marca.fundacion}</span>
            </span>
          </Link>

          <nav
            aria-label={textosAdmin.nav.etiqueta}
            className="escritorio:flex hidden items-center justify-center gap-(--spacing-tabs-admin)"
          >
            <Pestanas onNavegar={() => setMenuAbierto(false)} />
          </nav>

          <div className="col-start-3 flex items-center gap-(--spacing-cuenta-admin) justify-self-end">
            <button
              type="button"
              className="rounded-pill text-negro tablet:hidden inline-flex size-(--size-toque-admin) items-center justify-center"
              aria-expanded={menuAbierto}
              aria-controls={menuId}
              onClick={() => setMenuAbierto((abierto) => !abierto)}
            >
              {menuAbierto ? (
                <X className="size-6" aria-hidden="true" />
              ) : (
                <Menu className="size-6" aria-hidden="true" />
              )}
              <span className="sr-only">
                {menuAbierto ? textosAdmin.supuestos.cerrarMenu : textosAdmin.supuestos.abrirMenu}
              </span>
            </button>

            <p
              className="rounded-pill bg-amarillo t-avatar text-negro escritorio:size-(--size-marca-admin) flex size-(--size-toque-admin) shrink-0 items-center justify-center"
              aria-label={nombre}
            >
              <span aria-hidden="true">{inicialDe(nombre)}</span>
            </p>

            <BotonPildora
              variante="ghost"
              className="escritorio:min-h-(--size-boton-admin) min-h-(--size-toque-admin)"
              disabled={cerrando}
              aria-busy={cerrando}
              onClick={() => void manejarLogout()}
            >
              {textosAdmin.nav.salir}
            </BotonPildora>
          </div>
        </div>

        <nav
          aria-label={textosAdmin.nav.etiqueta}
          className="tablet:flex escritorio:hidden hidden flex-wrap items-center justify-center gap-(--spacing-tabs-admin) px-(--spacing-pagina-admin-compacto) pb-(--spacing-nav-admin)"
        >
          <Pestanas onNavegar={() => setMenuAbierto(false)} />
        </nav>

        <nav
          id={menuId}
          aria-label={textosAdmin.nav.etiqueta}
          className={cn(
            'tablet:hidden flex-col items-start gap-(--spacing-tabs-admin) px-(--spacing-pagina-admin-compacto) pb-(--spacing-nav-admin)',
            menuAbierto ? 'flex' : 'hidden',
          )}
        >
          <Pestanas amplia onNavegar={() => setMenuAbierto(false)} />
        </nav>
      </header>

      {error && (
        <p
          className="t-small escritorio:px-(--spacing-pagina-admin) px-(--spacing-pagina-admin-compacto) pt-4 text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <main className="escritorio:px-(--spacing-pagina-admin) flex min-h-0 flex-1 flex-col px-(--spacing-pagina-admin-compacto) py-(--spacing-bloque-admin)">
        <Outlet />
      </main>
    </div>
  );
}
