import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Historia } from '../../modules/historias/entities/historia.entity.js';

const RUTA_MIGRACION = fileURLToPath(
  new URL('./1734000000000-CrearTablaHistorias.ts', import.meta.url),
);

const codigo = readFileSync(RUTA_MIGRACION, 'utf8');
const cuerpoUp = codigo.slice(
  codigo.indexOf('public async up('),
  codigo.indexOf('public async down('),
);
const cuerpoDown = codigo.slice(codigo.indexOf('public async down('));

/** Columnas declaradas en el CREATE TABLE de la migración. */
function columnasDeMigracion(): string[] {
  const inicio = cuerpoUp.indexOf('CREATE TABLE');
  const fin = cuerpoUp.indexOf('CONSTRAINT historias_pkey');
  const columnas: string[] = [];

  for (const linea of cuerpoUp.slice(inicio, fin).split('\n')) {
    const coincidencia =
      /^\s{8}([a-z_]+)\s+(uuid|text|integer|date|boolean|timestamptz)\b/.exec(
        linea,
      );

    if (coincidencia) {
      columnas.push(coincidencia[1]);
    }
  }

  return columnas;
}

describe('migración de historias destacadas', () => {
  it('la entidad y la migración declaran exactamente las mismas columnas', () => {
    const desdeEntidad = getMetadataArgsStorage()
      .columns.filter((columna) => columna.target === Historia)
      .map((columna) => columna.options.name ?? columna.propertyName)
      .sort();

    // Las FK (`creado_por`, ...) se declaran con @Column y @JoinColumn.
    expect([...new Set(desdeEntidad)]).toEqual(
      [...columnasDeMigracion()].sort(),
    );
  });

  it('no se relaciona con animales ni guarda estado de adopción', () => {
    expect(cuerpoUp).not.toMatch(/REFERENCES\s+public\.animales/i);
    expect(cuerpoUp).not.toMatch(/animal_id/i);
    expect(cuerpoUp).not.toMatch(/adoptado|estado/i);
  });

  it('guarda título y texto en español e inglés, obligatorios y no vacíos', () => {
    for (const columna of ['titulo_es', 'titulo_en', 'texto_es', 'texto_en']) {
      expect(cuerpoUp).toMatch(new RegExp(`${columna}\\s+text\\s+NOT NULL`));
      expect(cuerpoUp).toContain(`length(btrim(${columna})) > 0`);
    }
  });

  it('guarda la fecha pública y las dimensiones de la foto', () => {
    expect(cuerpoUp).toMatch(/fecha_historia\s+date\s+NOT NULL/);
    expect(cuerpoUp).toMatch(/foto_ancho\s+integer/);
    expect(cuerpoUp).toMatch(/foto_alto\s+integer/);
  });

  it('incluye orden, visibilidad (oculta por defecto) y borrado lógico', () => {
    expect(cuerpoUp).toMatch(/orden\s+integer\s+NOT NULL DEFAULT 0/);
    expect(cuerpoUp).toMatch(/visible\s+boolean\s+NOT NULL DEFAULT false/);
    expect(cuerpoUp).toMatch(/eliminado_en\s+timestamptz/);
    expect(cuerpoUp).toContain('WHERE eliminado_en IS NULL');
  });

  it('registra los cambios en auditoría y mantiene actualizado_en', () => {
    expect(cuerpoUp).toContain('trg_historias_auditoria');
    expect(cuerpoUp).toContain("fn_registrar_auditoria('completo')");
    expect(cuerpoUp).toContain('trg_historias_actualizado_en');
  });

  it('activa RLS sin políticas y revoca el acceso a los roles públicos', () => {
    expect(cuerpoUp).toContain(
      'ALTER TABLE public.historias ENABLE ROW LEVEL SECURITY',
    );
    expect(cuerpoUp).not.toMatch(/CREATE\s+POLICY/i);

    for (const rol of ['PUBLIC', 'anon', 'authenticated', 'service_role']) {
      expect(cuerpoUp).toContain(
        `REVOKE ALL ON TABLE public.historias FROM ${rol}`,
      );
    }
  });

  it('no modifica ninguna tabla existente y la reversión solo borra historias', () => {
    expect(cuerpoUp).not.toMatch(/ALTER\s+TABLE\s+public\.(?!historias)/i);
    expect(cuerpoUp).not.toMatch(/DROP\s+|TRUNCATE|DELETE\s+FROM/i);
    expect(cuerpoDown).toContain('DROP TABLE IF EXISTS public.historias');
    expect(cuerpoDown).not.toMatch(/DROP\s+(SCHEMA|COLUMN)/i);
  });
});
