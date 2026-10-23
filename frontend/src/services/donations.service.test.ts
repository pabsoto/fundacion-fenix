import { describe, expect, it } from 'vitest';
import {
  getDonationAvailability,
  type PublicDonation,
} from './donations.service';

const demoDonation: PublicDonation = {
  titular: 'DEMO',
  banco: 'Banco de prueba',
  telefono: '00000000',
  referencia: 'PRUEBA',
  numeroCuenta: null,
  aviso: { es: 'No donar', en: 'Do not donate' },
  qrUrl: 'https://example.test/qr-demo.png',
};

describe('presentación pública de donaciones', () => {
  it('muestra sólo el QR de prueba en modo demostración', () => {
    expect(getDonationAvailability(demoDonation, true)).toEqual({
      isDemo: true,
      canDonate: false,
      showDemoQr: true,
      showOfficialQr: false,
      showQr: true,
    });
  });

  it('oculta el QR DEMO al desactivar el modo demostración', () => {
    expect(getDonationAvailability(demoDonation, false)).toMatchObject({
      canDonate: false,
      showDemoQr: false,
      showQr: false,
    });
  });

  it('mantiene disponible una configuración oficial válida', () => {
    const official = {
      ...demoDonation,
      titular: 'Fundación Fénix LPB',
      banco: 'Banco oficial',
      referencia: 'Donación',
      aviso: { es: 'Verifique los datos', en: 'Verify the details' },
    };

    expect(getDonationAvailability(official, false)).toMatchObject({
      isDemo: false,
      canDonate: true,
      showOfficialQr: true,
      showQr: true,
    });
  });
});
