const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(
  /\/$/,
  '',
);

export type AdminDonation = {
  titular: string;
  banco: string;
  telefono: string;
  referencia: string;
  numeroCuenta: string | null;
  avisoEs: string | null;
  avisoEn: string | null;
  activo: boolean;
  qr: { disponible: boolean; venceEl: string | null };
};

export type SaveAdminDonation = Omit<AdminDonation, 'activo' | 'qr'>;

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `Error de donaciones (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getAdminDonation(): Promise<AdminDonation | null> {
  const response = await request<{ donacion: AdminDonation | null }>('/admin/donaciones');
  return response.donacion;
}

export async function saveAdminDonation(
  donation: SaveAdminDonation,
  csrfToken: string,
): Promise<AdminDonation> {
  const response = await request<{ donacion: AdminDonation }>('/admin/donaciones', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(donation),
  });
  return response.donacion;
}

export async function uploadDonationQr(
  file: File,
  expiration: string,
  csrfToken: string,
): Promise<void> {
  const form = new FormData();
  form.append('archivo', file);
  if (expiration) form.append('qrVenceEl', expiration);
  await request('/admin/donaciones/qr', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: form,
  });
}

export async function deleteDonationQr(csrfToken: string): Promise<void> {
  await request('/admin/donaciones/qr', {
    method: 'DELETE',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}
