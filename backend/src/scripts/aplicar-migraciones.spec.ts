import { vi } from 'vitest';

const dobles = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  ejecutar: vi.fn(),
  consultar: vi.fn(),
}));

vi.mock('pino', () => ({
  pino: () => ({ info: dobles.info, error: dobles.error }),
}));

vi.mock('../database/typeorm.datasource.js', () => ({
  default: {
    options: { url: 'postgresql://usuario:clave-secreta@localhost/base' },
    initialize: vi.fn(),
    destroy: vi.fn(),
    query: dobles.consultar,
    runMigrations: dobles.ejecutar,
  },
}));

vi.mock('../database/proteger-migrations.js', () => ({
  asegurarTablaMigrations: vi.fn(),
  leerEstadoProteccionMigrations: vi.fn().mockResolvedValue({
    existe: true,
    rlsActivo: true,
    politicas: 0,
    visitantesConLectura: false,
  }),
}));

describe('log de la aplicación de migraciones', () => {
  const argumentos = process.argv;
  let aplicadasEnBase: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.argv = [...argumentos, '--confirmar'];
    aplicadasEnBase = [];
    dobles.consultar.mockImplementation(async (sql: string) =>
      sql.includes('to_regclass')
        ? [{ existe: true }]
        : aplicadasEnBase.map((name) => ({ name })),
    );
  });

  afterEach(() => {
    process.argv = argumentos;
    process.exitCode = undefined;
    vi.restoreAllMocks();
  });

  it('registra cada migración aplicada', async () => {
    dobles.ejecutar.mockResolvedValue([{ name: 'Uno1' }, { name: 'Dos2' }]);

    await import('./aplicar-migraciones.js');

    expect(dobles.info.mock.calls.map(([datos]) => datos)).toEqual([
      { evento: 'migracion_aplicada', migracion: 'Uno1' },
      { evento: 'migracion_aplicada', migracion: 'Dos2' },
    ]);
    expect(dobles.error).not.toHaveBeenCalled();
  });

  it('registra las aplicadas antes de un fallo y el error, sin la consulta', async () => {
    dobles.ejecutar.mockImplementation(async () => {
      aplicadasEnBase = ['Uno1'];
      throw Object.assign(new Error('relación inexistente'), {
        query: 'SELECT secreto',
      });
    });

    await import('./aplicar-migraciones.js');

    expect(dobles.info.mock.calls.map(([datos]) => datos)).toEqual([
      { evento: 'migracion_aplicada', migracion: 'Uno1' },
    ]);
    const datos = dobles.error.mock.calls[0]?.[0] as Record<string, string>;
    expect(datos.evento).toBe('migraciones_fallidas');
    expect(datos.stack).toContain('relación inexistente');
    expect(JSON.stringify(dobles.error.mock.calls)).not.toMatch(
      /SELECT secreto|clave-secreta/,
    );
    expect(process.exitCode).toBe(1);
  });
});
