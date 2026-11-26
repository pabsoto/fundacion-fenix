import {
  fechaDeArchivo,
  nombreArchivoExportacion,
} from './archivo-exportacion.js';

describe('archivo de exportación', () => {
  // 2026-11-20 02:00 UTC sigue siendo 19 de noviembre en Bolivia (UTC-4).
  const ahora = new Date('2026-11-20T02:00:00Z');

  it('fecha el archivo con el día de La Paz', () => {
    expect(fechaDeArchivo(ahora)).toBe('2026-11-19');
  });

  it.each(['csv', 'pdf'] as const)(
    'usa el módulo, la fecha y la extensión %s',
    (formato) => {
      expect(nombreArchivoExportacion('campanas', formato, ahora)).toBe(
        `campanas_2026-11-19.${formato}`,
      );
    },
  );
});
