import { describe, expect, it } from 'vitest';
import { estadoVigenciaQr, fechaHoyEnLaPaz } from './vigencia-qr';

const HOY = '2026-11-26';

describe('estadoVigenciaQr', () => {
  it('ayer está vencido, hoy y mañana siguen vigentes', () => {
    expect(estadoVigenciaQr('2026-11-25', true, HOY)).toEqual({
      estado: 'vencido',
      fecha: '2026-11-25',
    });
    expect(estadoVigenciaQr(HOY, true, HOY)).toEqual({ estado: 'vigente', fecha: HOY });
    expect(estadoVigenciaQr('2026-11-27', true, HOY)).toEqual({
      estado: 'vigente',
      fecha: '2026-11-27',
    });
  });

  it('sin fecha sigue vigente y sin QR no depende de la fecha', () => {
    expect(estadoVigenciaQr(null, true, HOY)).toEqual({ estado: 'vigente', fecha: null });
    expect(estadoVigenciaQr('   ', true, HOY)).toEqual({ estado: 'vigente', fecha: null });
    expect(estadoVigenciaQr('2026-12-31', false, HOY)).toEqual({ estado: 'sin-qr' });
    expect(estadoVigenciaQr(null, false, HOY)).toEqual({ estado: 'sin-qr' });
  });

  it('sigue vigente si en UTC ya es el día siguiente pero en La Paz sigue siendo el día de vencimiento', () => {
    const instante = new Date('2026-11-27T03:30:00.000Z');
    expect(fechaHoyEnLaPaz(instante)).toBe('2026-11-26');
    expect(estadoVigenciaQr('2026-11-26', true, instante)).toEqual({
      estado: 'vigente',
      fecha: '2026-11-26',
    });
  });

  it('vence cuando en La Paz ya empezó el día siguiente', () => {
    const instante = new Date('2026-11-27T04:00:00.000Z');
    expect(fechaHoyEnLaPaz(instante)).toBe('2026-11-27');
    expect(estadoVigenciaQr('2026-11-26', true, instante).estado).toBe('vencido');
  });
});
