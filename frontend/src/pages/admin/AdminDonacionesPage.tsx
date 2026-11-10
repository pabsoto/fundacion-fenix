import { AdminDonationPanel } from '@/components/admin/AdminDonationPanel';
import { useAdminSesion } from '@/app/admin-sesion';

export function AdminDonacionesPage() {
  const sesion = useAdminSesion();
  return <AdminDonationPanel csrfToken={sesion.csrfToken} />;
}
