import { describe, expect, it } from 'vitest';
import {
  getDonationAvailability,
  isDemoDonation,
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

  it('no oculta la donación si prueba, test y demo están solo en el aviso', () => {
    const donation: PublicDonation = {
      ...demoDonation,
      titular: 'Fundación Fénix LPB',
      banco: 'Banco oficial',
      referencia: 'Donación',
      aviso: { es: 'Texto de prueba y demo', en: 'A test notice' },
    };

    expect(isDemoDonation(donation)).toBe(false);
    expect(getDonationAvailability(donation, false).canDonate).toBe(true);
  });

  it('oculta cuando el titular es DEMO - NO REALIZAR DONACIONES', () => {
    const donation: PublicDonation = {
      ...demoDonation,
      titular: 'DEMO - NO REALIZAR DONACIONES',
      banco: 'Banco oficial',
      referencia: 'Donación',
      aviso: { es: 'Verifique los datos', en: 'Verify the details' },
    };

    expect(isDemoDonation(donation)).toBe(true);
    expect(getDonationAvailability(donation, false).canDonate).toBe(false);
  });

  it('oculta cuando el banco es BANCO FICTICIO DE PRUEBA', () => {
    const donation: PublicDonation = {
      ...demoDonation,
      titular: 'Fundación Fénix LPB',
      banco: 'BANCO FICTICIO DE PRUEBA',
      referencia: 'Donación',
      aviso: { es: 'Verifique los datos', en: 'Verify the details' },
    };

    expect(isDemoDonation(donation)).toBe(true);
    expect(getDonationAvailability(donation, false).canDonate).toBe(false);
  });

  it('no confunde Contestación con test', () => {
    const donation: PublicDonation = {
      ...demoDonation,
      titular: 'Fundación Fénix LPB',
      banco: 'Banco oficial',
      referencia: 'Contestación',
      aviso: { es: 'Contestación', en: 'Contestación' },
    };

    expect(isDemoDonation(donation)).toBe(false);
  });
});
