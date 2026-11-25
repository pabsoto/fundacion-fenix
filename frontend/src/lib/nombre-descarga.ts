const EXTENSION = /\.(csv|pdf)$/i;
const PROHIBIDOS = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|']);

function quitarProhibidos(valor: string): string {
  let salida = '';
  for (const caracter of valor) {
    if (caracter.charCodeAt(0) < 32 || PROHIBIDOS.has(caracter)) continue;
    salida += caracter;
  }
  return salida;
}

/** Nombre que el navegador usa al guardar. El servidor no lo decide. */
export function nombreDeDescarga(escrito: string, sugerido: string, extension: 'csv' | 'pdf'): string {
  let base = quitarProhibidos(escrito.replace(EXTENSION, ''));
  base = base.replace(/\s+/g, ' ').trim().replace(/[.\s]+$/g, '');
  if (!base) base = sugerido;
  if (base.length > 80) base = base.slice(0, 80).replace(/[.\s]+$/g, '');
  if (!base) base = sugerido;
  return `${base}.${extension}`;
}

/** Fecha de hoy en La Paz, como AAAA-MM-DD. */
export function fechaArchivoLaPaz(ahora = new Date()): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

export function nombreSugerido(modulo: 'campanas' | 'animales', ahora = new Date()): string {
  return `${modulo}_${fechaArchivoLaPaz(ahora)}`;
}
