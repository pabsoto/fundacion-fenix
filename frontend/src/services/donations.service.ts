import { fetchApi } from './api';
import type { BilingualText } from './institutional.service';

export type PublicDonation = {
  titular: string;
  banco: string;
  telefono: string;
  referencia: string;
  numeroCuenta: string | null;
  aviso: BilingualText;
  qrUrl: string | null;
};

type PublicDonationResponse = { donacion: PublicDonation | null };

export async function getPublicDonation(): Promise<PublicDonation | null> {
  const response = await fetchApi<PublicDonationResponse>('/public/donaciones');
  return response.donacion;
}

export function isDemoDonation(donation: PublicDonation): boolean {
  const content = [
    donation.titular,
    donation.banco,
    donation.referencia,
    donation.aviso.es ?? '',
    donation.aviso.en ?? '',
  ].join(' ');
  return /\b(DEMO|PRUEBA|TEST|FICTICI[OA])\b/i.test(content);
}
