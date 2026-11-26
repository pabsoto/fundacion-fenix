import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { ZONA_HORARIA_FUNDACION } from './archivo-exportacion.js';
import { DIAMETRO_LOGO, dibujarLogo } from './logo-pdf.js';

export const TIPO_CONTENIDO_PDF = 'application/pdf';

export type CeldaPdf = string | number | boolean | null | undefined;

export interface ColumnaPdf<T> {
  readonly encabezado: string;
  /** Peso relativo: el ancho disponible se reparte en proporción. */
  readonly ancho: number;
  readonly alineacion?: 'left' | 'right';
  readonly valor: (fila: T) => CeldaPdf;
}

export interface DocumentoPdf<T> {
  readonly titulo: string;
  /** Filtros aplicados, ya redactados. Vacío significa que no hay filtros. */
  readonly filtros: readonly string[];
  readonly columnas: readonly ColumnaPdf<T>[];
  readonly filas: readonly T[];
  readonly generadoEn?: Date;
}

// Las fuentes se incrustan en el PDF; `nest build` las copia a `dist/assets`.
const rutaFuente = (archivo: string) =>
  fileURLToPath(new URL(`../../assets/fonts/${archivo}`, import.meta.url));
const FUENTE_NORMAL = rutaFuente('NotoSans-Regular.ttf');
const FUENTE_NEGRITA = rutaFuente('NotoSans-Bold.ttf');
const NORMAL = 'normal';
const NEGRITA = 'negrita';

const MARGEN = 36;
/** Espacio reservado al pie para el número de página. */
const ALTO_PIE = 20;
const RELLENO = 4;
const TAMANO_TABLA = 8.5;

const NEGRO = '#1c1c1c';
const GRIS = '#666666';
const LINEA = '#d9d9d9';
const FONDO_ENCABEZADO = '#ffc200';

/** `DD/MM/AAAA` a partir de una fecha calendario `AAAA-MM-DD`. */
export function fechaLegible(fecha: string | null): string | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Fecha y hora `DD/MM/AAAA HH:MM` en la zona horaria de la fundación. */
export function fechaHoraDeGeneracion(ahora: Date): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('es-BO', {
      timeZone: ZONA_HORARIA_FUNDACION,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ahora)
      .map((parte) => [parte.type, parte.value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

function textoDeCelda(celda: CeldaPdf): string {
  if (celda === null || celda === undefined || celda === '') return '—';
  if (typeof celda === 'boolean') return celda ? 'Sí' : 'No';
  return String(celda);
}

function dibujarEncabezado<T>(
  doc: PDFKit.PDFDocument,
  documento: DocumentoPdf<T>,
  ancho: number,
): number {
  dibujarLogo(doc, MARGEN, MARGEN, { normal: NORMAL, negrita: NEGRITA });

  let y = MARGEN + DIAMETRO_LOGO + 14;
  const escribir = (
    texto: string,
    fuente: string,
    tamano: number,
    color: string,
  ) => {
    doc.font(fuente).fontSize(tamano).fillColor(color);
    doc.text(texto, MARGEN, y, { width: ancho });
    y = doc.y + 2;
  };

  escribir(documento.titulo, NEGRITA, 16, NEGRO);
  escribir(
    `Generado el ${fechaHoraDeGeneracion(documento.generadoEn ?? new Date())} (hora de La Paz)`,
    NORMAL,
    9,
    GRIS,
  );
  const filtros = documento.filtros.length
    ? documento.filtros.join(' · ')
    : 'ninguno';
  escribir(`Filtros aplicados: ${filtros}`, NORMAL, 9, GRIS);
  escribir(`Registros: ${documento.filas.length}`, NORMAL, 9, GRIS);
  return y + 8;
}

function dibujarTabla<T>(
  doc: PDFKit.PDFDocument,
  { columnas, filas }: DocumentoPdf<T>,
  inicio: number,
  ancho: number,
): void {
  const pesoTotal = columnas.reduce((suma, columna) => suma + columna.ancho, 0);
  const anchos = columnas.map((columna) => (columna.ancho / pesoTotal) * ancho);
  const limite = doc.page.height - MARGEN - ALTO_PIE;
  let y = inicio;

  const medir = (celdas: readonly string[], fuente: string) => {
    doc.font(fuente).fontSize(TAMANO_TABLA);
    return (
      Math.max(
        ...celdas.map((celda, i) =>
          doc.heightOfString(celda, { width: anchos[i]! - RELLENO * 2 }),
        ),
      ) +
      RELLENO * 2
    );
  };

  const dibujarFila = (
    celdas: readonly string[],
    fuente: string,
    alto: number,
    fondo?: string,
  ) => {
    if (fondo) doc.rect(MARGEN, y, ancho, alto).fill(fondo);
    doc.font(fuente).fontSize(TAMANO_TABLA).fillColor(NEGRO);
    let x = MARGEN;
    celdas.forEach((celda, i) => {
      doc.text(celda, x + RELLENO, y + RELLENO, {
        width: anchos[i]! - RELLENO * 2,
        // Medio punto de holgura para que el redondeo no corte la última línea.
        height: alto - RELLENO * 2 + 0.5,
        ellipsis: true,
        align: columnas[i]!.alineacion ?? 'left',
      });
      x += anchos[i]!;
    });
    y += alto;
    doc
      .moveTo(MARGEN, y)
      .lineTo(MARGEN + ancho, y)
      .lineWidth(0.5)
      .stroke(LINEA);
  };

  const titulos = columnas.map((columna) => columna.encabezado);
  const altoTitulos = medir(titulos, NEGRITA);
  const dibujarTitulos = () =>
    dibujarFila(titulos, NEGRITA, altoTitulos, FONDO_ENCABEZADO);

  const nuevaPagina = () => {
    doc.addPage();
    y = MARGEN;
    dibujarTitulos();
  };

  dibujarTitulos();

  if (filas.length === 0) {
    doc.font(NORMAL).fontSize(10).fillColor(GRIS);
    doc.text('Sin registros para los filtros aplicados.', MARGEN, y + 12, {
      width: ancho,
      align: 'center',
    });
    return;
  }

  // Una fila nunca supera una página: el texto sobrante se recorta con «…».
  const altoMaximo = limite - MARGEN - altoTitulos;
  for (const fila of filas) {
    const celdas = columnas.map((columna) => textoDeCelda(columna.valor(fila)));
    const alto = Math.min(medir(celdas, NORMAL), altoMaximo);
    if (y + alto > limite) nuevaPagina();
    dibujarFila(celdas, NORMAL, alto);
  }
}

function numerarPaginas(doc: PDFKit.PDFDocument, ancho: number): void {
  const { start, count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(start + i);
    // Sin margen inferior, escribir en el pie no abre una página nueva.
    doc.page.margins.bottom = 0;
    doc.font(NORMAL).fontSize(8).fillColor(GRIS);
    doc.text(
      `Página ${i + 1} de ${count}`,
      MARGEN,
      doc.page.height - MARGEN - 8,
      { width: ancho, align: 'right', lineBreak: false },
    );
  }
}

/** PDF A4 apaisado con logo, título, fecha, filtros y una tabla paginada. */
export function generarPdf<T>(documento: DocumentoPdf<T>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGEN,
      bufferPages: true,
      // Evita que pdfkit cargue Helvetica, que no se incrusta en el archivo.
      font: FUENTE_NORMAL,
      lang: 'es-BO',
      displayTitle: true,
      info: { Title: documento.titulo, Author: 'Fundación FÉNIX LPB' },
    });
    const trozos: Buffer[] = [];
    doc.on('data', (trozo: Buffer) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    doc.registerFont(NORMAL, FUENTE_NORMAL);
    doc.registerFont(NEGRITA, FUENTE_NEGRITA);

    const ancho = doc.page.width - MARGEN * 2;
    const inicio = dibujarEncabezado(doc, documento, ancho);
    dibujarTabla(doc, documento, inicio, ancho);
    numerarPaginas(doc, ancho);
    doc.end();
  });
}
