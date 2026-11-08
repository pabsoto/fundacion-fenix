import { Outlet } from 'react-router-dom';
import { AdminTopBar } from './AdminTopBar';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-crema">
      <AdminTopBar />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-10 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
