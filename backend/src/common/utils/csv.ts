/** Marca de orden de bytes que Excel necesita para leer UTF-8 con acentos y ñ. */
export const BOM_UTF8 = '\uFEFF';
export const SEPARADOR_CSV = ';';
export const TIPO_CONTENIDO_CSV = 'text/csv; charset=utf-8';

export type CeldaCsv = string | number | boolean | null | undefined;

export interface ColumnaCsv<T> {
  readonly encabezado: string;
  readonly valor: (fila: T) => CeldaCsv;
}

/** Caracteres con los que Excel interpreta una celda como fórmula. */
const INICIO_FORMULA = /^[=+\-@\t\r]/;

/**
 * Neutraliza una celda de texto que Excel ejecutaría como fórmula
 * anteponiéndole una comilla simple. Los números reales no se modifican.
 */
export function neutralizarFormula(texto: string): string {
  return INICIO_FORMULA.test(texto) ? `'${texto}` : texto;
}

function serializarCelda(celda: CeldaCsv): string {
  if (celda === null || celda === undefined) return '';
  if (typeof celda === 'number') return String(celda);
  if (typeof celda === 'boolean') return celda ? 'Sí' : 'No';
  const texto = neutralizarFormula(celda);
  return /["\n\r;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Genera un CSV con BOM, separador `;` y saltos de línea CRLF. */
export function generarCsv<T>(
  columnas: readonly ColumnaCsv<T>[],
  filas: readonly T[],
): string {
  const lineas = [
    columnas.map((columna) => serializarCelda(columna.encabezado)),
    ...filas.map((fila) =>
      columnas.map((columna) => serializarCelda(columna.valor(fila))),
    ),
  ].map((celdas) => celdas.join(SEPARADOR_CSV));
  return `${BOM_UTF8}${lineas.join('\r\n')}\r\n`;
}

/** Fecha calendario (AAAA-MM-DD) en la zona horaria de la fundación. */
export function fechaDeArchivo(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

/** Nombre de archivo `modulo_AAAA-MM-DD.csv`. */
export function nombreArchivoCsv(modulo: string, ahora?: Date): string {
  return `${modulo}_${fechaDeArchivo(ahora)}.csv`;
}
