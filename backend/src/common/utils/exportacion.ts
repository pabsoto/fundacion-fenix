import { StreamableFile } from '@nestjs/common';
import type { FormatoExportacion } from '../dto/formato-exportacion.js';
import { nombreArchivoExportacion } from './archivo-exportacion.js';
import { generarCsv, TIPO_CONTENIDO_CSV, type ColumnaCsv } from './csv.js';
import { generarPdf, TIPO_CONTENIDO_PDF, type DocumentoPdf } from './pdf.js';

export interface Exportacion<T> {
  /** Prefijo del nombre de archivo, p. ej. `campanas`. */
  readonly modulo: string;
  readonly formato: FormatoExportacion;
  readonly filas: readonly T[];
  readonly columnasCsv: readonly ColumnaCsv<T>[];
  readonly pdf: Pick<DocumentoPdf<T>, 'titulo' | 'filtros' | 'columnas'>;
}

/** Archivo descargable en el formato pedido. */
export async function crearArchivoExportado<T>({
  modulo,
  formato,
  filas,
  columnasCsv,
  pdf,
}: Exportacion<T>): Promise<StreamableFile> {
  // Un solo instante para que el nombre y el encabezado no difieran.
  const ahora = new Date();
  const contenido =
    formato === 'pdf'
      ? await generarPdf({ ...pdf, filas, generadoEn: ahora })
      : Buffer.from(generarCsv(columnasCsv, filas), 'utf8');
  return new StreamableFile(contenido, {
    type: formato === 'pdf' ? TIPO_CONTENIDO_PDF : TIPO_CONTENIDO_CSV,
    disposition: `attachment; filename="${nombreArchivoExportacion(modulo, formato, ahora)}"`,
    length: contenido.length,
  });
}
