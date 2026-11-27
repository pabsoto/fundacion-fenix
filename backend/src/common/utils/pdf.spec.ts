import { fuentesDelPdf, leerPaginasPdf } from '../../../test/utils/leer-pdf.js';
import {
  fechaHoraDeGeneracion,
  fechaLegible,
  generarPdf,
  type ColumnaPdf,
} from './pdf.js';

interface Fila {
  nombre: string | null;
  activo: boolean;
}

const columnas: ColumnaPdf<Fila>[] = [
  { encabezado: 'Nombre', ancho: 3, valor: (f) => f.nombre },
  { encabezado: 'Activo', ancho: 1, valor: (f) => f.activo },
];

const crear = (filas: Fila[], filtros: string[] = []) =>
  generarPdf({
    titulo: 'Campañas de esterilización',
    filtros,
    columnas,
    filas,
    generadoEn: new Date('2026-11-20T02:05:00Z'),
  });

describe('pdf', () => {
  it('incrusta el recurso oficial del logo en el encabezado', async () => {
    const contenido = await crear([]);

    expect(contenido.toString('latin1')).toContain('/Subtype /Image');
  });

  it('muestra acentos y ñ en el encabezado y en la tabla', async () => {
    const contenido = await crear(
      [{ nombre: 'Señor Ñandú · Esterilización ÁÉÍÓÚ ü', activo: true }],
      ['Año: 2026', 'Búsqueda: «peña»'],
    );

    expect(contenido.subarray(0, 5).toString()).toBe('%PDF-');
    const [pagina] = await leerPaginasPdf(contenido);
    expect(pagina).toContain('Fénix LPB');
    expect(pagina).toContain('Campañas de esterilización');
    expect(pagina).toContain('Generado el 19/11/2026 22:05 (hora de La Paz)');
    expect(pagina).toContain('Filtros aplicados: Año: 2026 · Búsqueda: «peña»');
    expect(pagina).toContain('Señor Ñandú · Esterilización ÁÉÍÓÚ ü');
    expect(pagina).toContain('Sí');
    expect(pagina).toContain('Página 1 de 1');
  });

  it('incrusta las dos fuentes y no usa ninguna externa', async () => {
    const { nombres, incrustadas } = fuentesDelPdf(
      await crear([{ nombre: 'Señor', activo: false }]),
    );

    expect(nombres.length).toBeGreaterThan(0);
    expect(nombres.every((nombre) => nombre?.includes('NotoSans'))).toBe(true);
    expect(incrustadas).toBe(2);
  });

  it('reparte las filas en páginas y repite los títulos de columna', async () => {
    const filas = Array.from({ length: 120 }, (_, i) => ({
      nombre: `Registro ${i + 1}.`,
      activo: false,
    }));

    const paginas = await leerPaginasPdf(await crear(filas));

    expect(paginas.length).toBeGreaterThan(2);
    paginas.forEach((pagina, i) => {
      expect(pagina).toContain('Nombre Activo');
      expect(pagina).toContain(`Página ${i + 1} de ${paginas.length}`);
    });
    const texto = paginas.join(' ');
    for (const { nombre } of filas) expect(texto).toContain(nombre);
  });

  it('indica que no hay filtros ni registros', async () => {
    const [pagina] = await leerPaginasPdf(await crear([]));

    expect(pagina).toContain('Filtros aplicados: ninguno');
    expect(pagina).toContain('Registros: 0');
    expect(pagina).toContain('Sin registros para los filtros aplicados.');
  });

  it('recorta una fila más alta que una página', async () => {
    const paginas = await leerPaginasPdf(
      await crear([
        { nombre: 'línea larga\n'.repeat(200), activo: true },
        { nombre: 'Última', activo: true },
      ]),
    );

    // Encabezado, la fila recortada a una página y la fila siguiente.
    expect(paginas.length).toBeLessThanOrEqual(3);
    expect(paginas.join(' ')).toContain('…');
    expect(paginas.at(-1)).toContain('Última');
    paginas.forEach((pagina) => expect(pagina).toContain('Nombre Activo'));
  });

  it('escribe un guion en las celdas vacías', async () => {
    const [pagina] = await leerPaginasPdf(
      await crear([{ nombre: null, activo: false }]),
    );

    expect(pagina).toContain('— No');
  });

  describe('fechas', () => {
    it('formatea una fecha calendario sin desplazarla de zona', () => {
      expect(fechaLegible('2026-01-01')).toBe('01/01/2026');
      expect(fechaLegible(null)).toBeNull();
    });

    it('usa la hora de La Paz', () => {
      expect(fechaHoraDeGeneracion(new Date('2026-01-01T03:00:00Z'))).toBe(
        '31/12/2025 23:00',
      );
    });
  });
});
