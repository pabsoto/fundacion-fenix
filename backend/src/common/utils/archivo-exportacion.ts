import type { FormatoExportacion } from '../dto/formato-exportacion.js';

/** Zona horaria con la que se fechan las exportaciones. */
export const ZONA_HORARIA_FUNDACION = 'America/La_Paz';

/** Fecha calendario (AAAA-MM-DD) en la zona horaria de la fundación. */
export function fechaDeArchivo(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString('en-CA', {
    timeZone: ZONA_HORARIA_FUNDACION,
  });
}

/** Nombre de archivo `modulo_AAAA-MM-DD.formato`. */
export function nombreArchivoExportacion(
  modulo: string,
  formato: FormatoExportacion,
  ahora?: Date,
): string {
  return `${modulo}_${fechaDeArchivo(ahora)}.${formato}`;
}
