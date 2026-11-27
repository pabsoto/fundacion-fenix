const ZONA_LA_PAZ = 'America/La_Paz';

/** Día calendario YYYY-MM-DD en America/La_Paz. */
export function fechaHoyEnLaPaz(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_LA_PAZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/**
 * Un QR sin fecha no vence. Con fecha, sigue vigente durante todo ese día
 * en America/La_Paz y vence al día siguiente.
 */
export function qrDonacionEstaVencido(
  venceEl: string | null,
  ahora: Date = new Date(),
): boolean {
  if (!venceEl) return false;
  return venceEl < fechaHoyEnLaPaz(ahora);
}
