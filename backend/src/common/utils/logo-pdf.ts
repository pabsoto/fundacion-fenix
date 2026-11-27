import { fileURLToPath } from 'node:url';

/**
 * Usa el recurso oficial del proyecto; conserva el nombre como texto del PDF
 * para que siga siendo seleccionable y accesible en exportaciones.
 */
const RUTA_LOGO = fileURLToPath(
  new URL('../../assets/logo-fundacion-fenix.png', import.meta.url),
);

export const DIAMETRO_LOGO = 64;

/** Dibuja el logo oficial y, a su derecha, el nombre como texto accesible. */
export function dibujarLogo(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  fuentes: { normal: string; negrita: string },
): void {
  doc.image(RUTA_LOGO, x, y, {
    fit: [DIAMETRO_LOGO, DIAMETRO_LOGO],
  });

  const xTexto = x + DIAMETRO_LOGO + 10;
  doc
    .font(fuentes.negrita)
    .fontSize(14)
    .fillColor('#1c1c1c')
    .text('Fénix LPB', xTexto, y + 5, { lineBreak: false });
  doc
    .font(fuentes.normal)
    .fontSize(8)
    .fillColor('#1c1c1c')
    .text('FUNDACIÓN', xTexto, y + 25, {
      lineBreak: false,
      characterSpacing: 1.2,
    });
}
