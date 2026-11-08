import { Link, useLocation } from 'react-router-dom';
import { adminStrings } from '../lib/strings';
import { UserMenu } from './UserMenu';
import { cn } from '@/lib/cn';

const navItems = [
  { path: '/admin/resumen', label: adminStrings.nav.summary },
  { path: '/admin/campanas', label: adminStrings.nav.campaigns },
  { path: '/admin/animales', label: adminStrings.nav.animals },
];

export function AdminTopBar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b border-linea bg-crema/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 lg:px-8">
        <Link
          to="/admin/resumen"
          className="flex items-center gap-3 hover:opacity-80"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amarillo">
            <span className="font-display text-lg font-bold text-negro">F</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-negro">
              FÉNIX
            </span>
            <span className="t-small text-negro/70">Panel</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Navegación del panel">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  't-nav px-4 py-2 rounded-full transition-colors',
                  isActive
                    ? 'bg-crema-tono text-negro'
                    : 'text-negro/70 hover:bg-crema-tono hover:text-negro',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="t-small hidden text-negro/70 hover:text-negro md:block"
          >
            {adminStrings.nav.viewSite} ↗
          </a>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
