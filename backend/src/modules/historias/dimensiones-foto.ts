import { UnsupportedMediaTypeException } from '@nestjs/common';
import { imageSize } from 'image-size';

/** Orientaciones EXIF en las que la foto se muestra girada 90° o 270°. */
const ORIENTACIONES_GIRADAS = new Set([5, 6, 7, 8]);

/**
 * Ancho y alto tal como los muestra el navegador. Las cámaras de celular
 * suelen guardar las fotos verticales en horizontal y anotar el giro en EXIF.
 */
export function leerDimensionesFoto(contenido: Buffer): {
  ancho: number;
  alto: number;
} {
  let medidas: ReturnType<typeof imageSize> | undefined;
  try {
    medidas = imageSize(contenido);
  } catch {
    medidas = undefined;
  }
  if (!medidas?.width || !medidas.height) {
    throw new UnsupportedMediaTypeException(
      'No fue posible leer las dimensiones de la fotografía',
    );
  }

  const girada = ORIENTACIONES_GIRADAS.has(medidas.orientation ?? 1);
  return girada
    ? { ancho: medidas.height, alto: medidas.width }
    : { ancho: medidas.width, alto: medidas.height };
}
