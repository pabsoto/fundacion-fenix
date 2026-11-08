import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { adminStrings } from '../lib/strings';
import { cn } from '@/lib/cn';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) return null;

  const initials = user.nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-negro text-crema hover:bg-naranja"
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        <span className="t-button">{initials}</span>
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-56 rounded-surface border border-linea bg-blanco p-4 shadow-pop',
            'animate-in fade-in slide-in-from-top-2',
          )}
          role="menu"
        >
          <p className="t-body-strong mb-3">{user.nombre}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="t-button w-full text-left text-negro hover:text-naranja"
            role="menuitem"
          >
            {adminStrings.userMenu.logout}
          </button>
        </div>
      )}
    </div>
  );
}
