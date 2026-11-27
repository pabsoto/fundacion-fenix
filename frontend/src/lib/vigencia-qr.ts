const ZONA_LA_PAZ = 'America/La_Paz';

export type EstadoVigenciaQr = 'vigente' | 'vencido' | 'sin-qr';

export type ResultadoVigenciaQr =
  | { estado: 'sin-qr' }
  | { estado: 'vigente'; fecha: string | null }
  | { estado: 'vencido'; fecha: string };

/** Día calendario YYYY-MM-DD en America/La_Paz. */
export function fechaHoyEnLaPaz(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_LA_PAZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

function diaDeReferencia(hoy: Date | string): string {
  return typeof hoy === 'string' ? hoy : fechaHoyEnLaPaz(hoy);
}

/**
 * TODO(backend): misma comparación que
 * backend/src/modules/donaciones/vigencia-qr.ts (`venceEl < día en America/La_Paz`).
 * El QR vale todo ese día y vence al siguiente. Sin fecha no vence.
 * El backend no tiene estado «sin QR»: allí lo decide la presencia del archivo.
 */
export function estadoVigenciaQr(
  venceEl: string | null,
  hayQr: boolean,
  hoy: Date | string = new Date(),
): ResultadoVigenciaQr {
  if (!hayQr) return { estado: 'sin-qr' };
  const fecha = venceEl?.trim() ? venceEl.trim() : null;
  if (!fecha) return { estado: 'vigente', fecha: null };
  if (fecha < diaDeReferencia(hoy)) return { estado: 'vencido', fecha };
  return { estado: 'vigente', fecha };
}
