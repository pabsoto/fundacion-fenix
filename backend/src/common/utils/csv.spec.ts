import {
  BOM_UTF8,
  generarCsv,
  neutralizarFormula,
  nombreArchivoCsv,
} from './csv.js';

describe('csv', () => {
  describe('neutralizarFormula', () => {
    it.each(['=1+1', '+1', '-1', '@SUMA(A1)', '\t=1', '\r=1'])(
      'antepone una comilla a %j',
      (texto) => {
        expect(neutralizarFormula(texto)).toBe(`'${texto}`);
      },
    );

    it('no modifica texto normal', () => {
      expect(neutralizarFormula('Campaña Ñandú')).toBe('Campaña Ñandú');
      expect(neutralizarFormula('a=b')).toBe('a=b');
    });
  });

  describe('generarCsv', () => {
    const columnas = [
      { encabezado: 'Nombre', valor: (f: { n: string }) => f.n },
      { encabezado: 'Edad', valor: (f: { e?: number | null }) => f.e },
    ];

    it('empieza con BOM, separa con ; y termina cada fila con CRLF', () => {
      const csv = generarCsv(
        [
          { encabezado: 'Nombre', valor: (f: { n: string }) => f.n },
          { encabezado: 'Lugar', valor: () => 'El Alto' },
        ],
        [{ n: 'Peña' }],
      );
      expect(csv.startsWith(BOM_UTF8)).toBe(true);
      expect(csv).toBe(`${BOM_UTF8}Nombre;Lugar\r\nPeña;El Alto\r\n`);
    });

    it('encierra entre comillas y escapa ; " y saltos de línea', () => {
      const csv = generarCsv(
        [{ encabezado: 'Texto', valor: (f: { t: string }) => f.t }],
        [{ t: 'a;b' }, { t: 'dice "hola"' }, { t: 'uno\ndos' }],
      );
      expect(csv).toContain('"a;b"');
      expect(csv).toContain('"dice ""hola"""');
      expect(csv).toContain('"uno\ndos"');
    });

    it('neutraliza fórmulas en texto y deja los números intactos', () => {
      const csv = generarCsv(columnas, [{ n: '=HYPERLINK("x")', e: -3 }]);
      expect(csv).toContain(`"'=HYPERLINK(""x"")";-3`);
    });

    it('serializa nulos como vacío y booleanos como Sí/No', () => {
      const csv = generarCsv(
        [
          { encabezado: 'A', valor: () => null },
          { encabezado: 'B', valor: () => true },
          { encabezado: 'C', valor: () => false },
        ],
        [{}],
      );
      expect(csv).toBe(`${BOM_UTF8}A;B;C\r\n;Sí;No\r\n`);
    });
  });

  describe('nombreArchivoCsv', () => {
    it('usa el módulo y la fecha de La Paz', () => {
      // 2026-11-20 02:00 UTC sigue siendo 19 de noviembre en Bolivia (UTC-4).
      expect(
        nombreArchivoCsv('campanas', new Date('2026-11-20T02:00:00Z')),
      ).toBe('campanas_2026-11-19.csv');
    });
  });
});
