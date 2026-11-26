/**
 * Logo actual del sitio dibujado como vectores. Reproduce `Logo.tsx` y
 * `FlameIcon` del frontend: si allí cambian, hay que actualizarlo aquí.
 */
const AMARILLO = '#ffc200';
const NARANJA = '#ff5402';
const NEGRO = '#1c1c1c';

const TRAZO_LLAMA =
  'M24 4c2.5 7-1 12-1 17 0 4 2.5 6 5.5 6 6.5 0 11-6.5 11-14 0-4.5-2.5-9-5-12 4.5 5.5 9 13 9 19.5 0 9.5-7.5 17-18.5 17S5.5 30 5.5 20.5c0-6.5 4.5-13 8.5-17-1.5 5.5 1 9.5 3 13 1.5-4.5 4.5-8.5 7-11Z';
const LADO_LLAMA = 48;

export const DIAMETRO_LOGO = 44;

/** Dibuja el círculo amarillo con la llama y, a su derecha, el nombre. */
export function dibujarLogo(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  fuentes: { normal: string; negrita: string },
): void {
  const radio = DIAMETRO_LOGO / 2;
  const ladoIcono = 24;
  const margenIcono = (DIAMETRO_LOGO - ladoIcono) / 2;

  doc.save();
  doc.circle(x + radio, y + radio, radio).fill(AMARILLO);
  doc.restore();

  doc.save();
  doc
    .translate(x + margenIcono, y + margenIcono)
    .scale(ladoIcono / LADO_LLAMA)
    .path(TRAZO_LLAMA)
    .lineWidth(2)
    .lineJoin('round')
    .fillAndStroke(NARANJA, NEGRO);
  doc.restore();

  const xTexto = x + DIAMETRO_LOGO + 10;
  doc
    .font(fuentes.negrita)
    .fontSize(14)
    .fillColor(NEGRO)
    .text('Fénix LPB', xTexto, y + 5, { lineBreak: false });
  doc
    .font(fuentes.normal)
    .fontSize(8)
    .text('FUNDACIÓN', xTexto, y + 25, {
      lineBreak: false,
      characterSpacing: 1.2,
    });
}
