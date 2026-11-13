import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Calendar, Heart, LayoutGrid, LogOut, PawPrint } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { FlameIcon } from '@/components/ui/icons';
import { useAdminSesion } from '@/app/admin-sesion';
import { useVistaMovil } from '@/hooks/useVistaMovil';
import { cn } from '@/lib/cn';
import { AuthApiError, cerrarSesion } from '@/services/auth.service';

const PESTANAS = [
  { to: '/admin', end: true, label: textosAdmin.nav.resumen, icono: LayoutGrid },
  { to: '/admin/campanas', end: false, label: textosAdmin.nav.campanas, icono: Calendar },
  { to: '/admin/animales', end: false, label: textosAdmin.nav.animales, icono: PawPrint },
  { to: '/admin/donaciones', end: false, label: textosAdmin.nav.donaciones, icono: Heart },
] as const;

const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

function Marca() {
  return (
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
  );
}

function Pestanas({ onNavegar }: { onNavegar?: () => void }) {
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

function BarraInferior() {
  return (
    <nav
      aria-label={textosAdmin.nav.etiqueta}
        className="border-linea bg-blanco fixed inset-x-0 bottom-0 z-40 flex items-start justify-center gap-(--spacing-tabs-movil) border-t px-(--spacing-barra-inferior-x) pt-(--spacing-barra-inferior-pt) pb-[max(var(--spacing-barra-inferior-pb),env(safe-area-inset-bottom,0px))]"
    >
      {PESTANAS.map((pestana) => {
        const Icono = pestana.icono;
        return (
          <NavLink
            key={pestana.to}
            to={pestana.to}
            end={pestana.end}
            className="flex min-w-0 flex-1 flex-col items-center gap-(--spacing-tab-gap) no-underline"
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-(--size-tab-indicador-y) w-(--size-tab-indicador-x) items-center justify-center rounded-pill',
                    isActive && 'bg-amarillo',
                  )}
                >
                  <Icono className="size-(--size-icono-tab)" aria-hidden="true" />
                </span>
                <span className={cn(isActive ? 't-tab-activa' : 't-tab', 'text-negro')}>
                  {pestana.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function MenuCuenta({
  id,
  nombre,
  cerrando,
  onCerrar,
  onSalir,
}: {
  id: string;
  nombre: string;
  cerrando: boolean;
  onCerrar: () => void;
  onSalir: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(onCerrar);

  useEffect(() => {
    cerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuRef.current?.querySelector<HTMLElement>('button')?.focus();

    function enfocable() {
      const nodo = menuRef.current;
      if (!nodo) return [];
      return [...nodo.querySelectorAll<HTMLElement>(ENFOCABLES)];
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        cerrarRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const lista = enfocable();
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (!primero || !ultimo) return;
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previo?.focus();
    };
  }, []);

  return createPortal(
    <>
      <button
        type="button"
        className="bg-velo fixed inset-0 z-50 cursor-default"
        aria-label={textosAdmin.supuestos.cerrarMenu}
        onClick={onCerrar}
      />
      <div
        ref={menuRef}
        id={id}
        role="menu"
        aria-label={nombre}
        className="border-negro bg-blanco shadow-menu-admin fixed z-50 flex w-(--spacing-menu-avatar) flex-col items-start rounded-admin border p-(--spacing-menu-avatar-y) top-[calc(env(safe-area-inset-top,0px)+var(--size-nav-movil))] right-(--spacing-nav-movil-x)"
      >
        <div className="flex w-full flex-col gap-0.5 p-3">
          <p className="t-body-strong text-negro">{nombre}</p>
          <p className="t-nota text-negro">{textosAdmin.nav.rol}</p>
        </div>
        <div className="bg-negro h-px w-full" />
        <button
          type="button"
          role="menuitem"
          className="rounded-btn flex h-(--size-control-admin) w-full items-center gap-3 px-3 text-left"
          disabled={cerrando}
          aria-busy={cerrando}
          onClick={onSalir}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          <span className="t-body-strong text-negro">{textosAdmin.nav.salir}</span>
        </button>
      </div>
    </>,
    document.body,
  );
}

export function AdminDashboardPage() {
  const sesion = useAdminSesion();
  const navigate = useNavigate();
  const movil = useVistaMovil();
  const menuId = useId();
  const nombre = sesion.administrador.nombre;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vistaMenu, setVistaMenu] = useState(movil);

  if (vistaMenu !== movil) {
    setVistaMenu(movil);
    if (!movil) setMenuAbierto(false);
  }

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
    <div className="bg-crema text-negro flex min-h-dvh flex-col">
      <header
        className={cn(
          'border-linea sticky top-0 z-40 border-b bg-crema',
          movil && 'pt-[env(safe-area-inset-top)]',
        )}
      >
        <div
          className={cn(
            movil
              ? 'flex items-center justify-between px-(--spacing-nav-movil-x) py-(--spacing-nav-movil-y)'
              : 'escritorio:grid-cols-[1fr_auto_1fr] escritorio:px-(--spacing-pagina-admin) grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-(--spacing-pagina-admin-compacto) py-(--spacing-nav-admin)',
          )}
        >
          <Marca />

          {movil ? null : (
            <nav
              aria-label={textosAdmin.nav.etiqueta}
              className="escritorio:flex hidden items-center justify-center gap-(--spacing-tabs-admin)"
            >
              <Pestanas />
            </nav>
          )}

          <div
            className={cn(
              'flex items-center justify-self-end',
              movil ? 'shrink-0' : 'col-start-3 gap-(--spacing-cuenta-admin)',
            )}
          >
            {movil ? (
              <button
                type="button"
                className="rounded-pill bg-amarillo t-avatar text-negro flex size-(--size-marca-admin) shrink-0 items-center justify-center"
                aria-expanded={menuAbierto}
                aria-haspopup="menu"
                aria-controls={menuId}
                aria-label={textosAdmin.nav.cuenta}
                onClick={() => setMenuAbierto((abierto) => !abierto)}
              >
                <span aria-hidden="true">{inicialDe(nombre)}</span>
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {movil ? null : (
          <nav
            aria-label={textosAdmin.nav.etiqueta}
            className="tablet:flex escritorio:hidden hidden flex-wrap items-center justify-center gap-(--spacing-tabs-admin) px-(--spacing-pagina-admin-compacto) pb-(--spacing-nav-admin)"
          >
            <Pestanas />
          </nav>
        )}
      </header>

      {movil && menuAbierto ? (
        <MenuCuenta
          id={menuId}
          nombre={nombre}
          cerrando={cerrando}
          onCerrar={() => setMenuAbierto(false)}
          onSalir={() => void manejarLogout()}
        />
      ) : null}

      {error ? (
        <p
          className={cn(
            't-small pt-4 text-red-700',
            movil
              ? 'px-(--spacing-pagina-admin-movil)'
              : 'escritorio:px-(--spacing-pagina-admin) px-(--spacing-pagina-admin-compacto)',
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <main
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-x-clip',
          movil
            ? 'px-(--spacing-pagina-admin-movil) pt-(--spacing-contenido-movil-y) pb-[calc(var(--spacing-contenido-bajo-barra)+env(safe-area-inset-bottom,0px))]'
            : 'escritorio:px-(--spacing-pagina-admin) px-(--spacing-pagina-admin-compacto) py-(--spacing-bloque-admin)',
        )}
      >
        <Outlet />
      </main>

      {movil ? <BarraInferior /> : null}
    </div>
  );
}
