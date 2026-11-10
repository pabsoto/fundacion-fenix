import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

/** Evita que los buscadores indexen el panel. No cambia la interfaz. */
export function AdminNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return <Outlet />;
}
