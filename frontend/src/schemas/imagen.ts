import { textosAdmin } from '@/content/textos-admin';

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAXIMO_BYTES = 5 * 1024 * 1024;

export function validarImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.has(archivo.type) || archivo.size > MAXIMO_BYTES) {
    return textosAdmin.supuestos.imagenInvalida;
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
