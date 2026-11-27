import { qrDonacionEstaVencido } from './vigencia-qr.js';

describe('vigencia del QR en America/La_Paz', () => {
  const mediodiaLaPaz = new Date('2026-11-26T16:00:00.000Z');

  it('vence ayer y sigue vigente si la fecha es hoy', () => {
    expect(qrDonacionEstaVencido('2026-11-25', mediodiaLaPaz)).toBe(true);
    expect(qrDonacionEstaVencido('2026-11-26', mediodiaLaPaz)).toBe(false);
  });

  it('sigue vigente entre las 20:00 y las 24:00 de La Paz, cuando en UTC ya es el día siguiente', () => {
    const veintiunaLaPaz = new Date('2026-11-27T01:00:00.000Z');
    expect(qrDonacionEstaVencido('2026-11-26', veintiunaLaPaz)).toBe(false);
    expect(qrDonacionEstaVencido('2026-11-25', veintiunaLaPaz)).toBe(true);
  });

  it('no vence si no hay fecha', () => {
    expect(qrDonacionEstaVencido(null, mediodiaLaPaz)).toBe(false);
  });
});
