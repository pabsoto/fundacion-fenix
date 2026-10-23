import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function PublicLayout() {
  return (
    <div>
      <Navbar />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
    </div>
  );
}
