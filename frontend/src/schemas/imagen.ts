import { textosAdmin } from '@/content/textos-admin';

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAXIMO_BYTES = 5 * 1024 * 1024;

/** El QR de donaciones admite 2 MB: el backend rechaza con 413 por encima de eso. */
export const MAXIMO_QR_MB = 2;
export const MAXIMO_QR_BYTES = MAXIMO_QR_MB * 1024 * 1024;

export function validarImagen(
  archivo: File,
  opciones?: { maximoBytes: number; mensaje: string },
): string | null {
  const maximo = opciones?.maximoBytes ?? MAXIMO_BYTES;
  if (!TIPOS_IMAGEN.has(archivo.type) || archivo.size > maximo) {
    return opciones?.mensaje ?? textosAdmin.supuestos.imagenInvalida;
  }
  return null;
}

export function validarImagenes(archivos: readonly File[]): string | null {
  for (const archivo of archivos) {
    const error = validarImagen(archivo);
    if (error) return error;
  }
  return null;
}
