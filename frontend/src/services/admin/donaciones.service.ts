import {
  getAdminDonation,
  saveAdminDonation,
  type AdminDonation,
  type SaveAdminDonation,
} from '@/services/admin-donations.service';

/**
 * Donaciones ya habla con la API. Estas funciones no son un mock:
 * delegan en el servicio actual, con la misma cookie y el mismo CSRF.
 */
// TODO(backend): el interior ya es GET/PUT /api/admin/donaciones.
export function getDonacion(): Promise<AdminDonation | null> {
  return getAdminDonation();
}

export function updateDonacion(
  datos: SaveAdminDonation,
  csrfToken: string,
): Promise<AdminDonation> {
  return saveAdminDonation(datos, csrfToken);
}
