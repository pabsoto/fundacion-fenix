import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Texto de cada página, tal como lo extraería un lector de PDF. */
export async function leerPaginasPdf(contenido: Buffer): Promise<string[]> {
  const tarea = getDocument({
    data: new Uint8Array(contenido),
    verbosity: VerbosityLevel.ERRORS,
  });
  const pdf = await tarea.promise;
  const paginas: string[] = [];
  for (let numero = 1; numero <= pdf.numPages; numero++) {
    const { items } = await (await pdf.getPage(numero)).getTextContent();
    paginas.push(
      items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' '),
    );
  }
  await tarea.destroy();
  return paginas;
}

/** Nombres de las fuentes declaradas y cuántas traen su archivo incrustado. */
export function fuentesDelPdf(contenido: Buffer) {
  const crudo = contenido.toString('latin1');
  return {
    nombres: [
      ...new Set(
        [...crudo.matchAll(/\/BaseFont \/([^\s/>]+)/g)].map((m) => m[1]),
      ),
    ],
    incrustadas: [...crudo.matchAll(/\/FontFile2 \d+ 0 R/g)].length,
  };
}
