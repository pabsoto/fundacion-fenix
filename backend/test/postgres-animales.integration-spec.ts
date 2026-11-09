import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

describe.skipIf(!URL_PRUEBAS)('animales en PostgreSQL (integración)', () => {
  let dataSource: DataSource;

  const insertar = (columnas: string, valores: unknown[]) =>
    dataSource.query(
      `INSERT INTO public.animales (${columnas})
       VALUES (${valores.map((_, indice) => `$${indice + 1}`).join(', ')})`,
      valores,
    );

  beforeAll(async () => {
    dataSource = new DataSource({
      ...createDatabaseOptions({
        DATABASE_URL: URL_PRUEBAS,
        ...(CA_PRUEBAS ? { DATABASE_CA_CERT_PATH: CA_PRUEBAS } : {}),
      } as NodeJS.ProcessEnv),
      ...(CA_PRUEBAS ? {} : { ssl: false }),
    });
    await dataSource.initialize();

    const queryRunner = dataSource.createQueryRunner();
    const migracion = new CrearTablaAnimales1732000000000();
    await migracion.down(queryRunner);
    await migracion.up(queryRunner);
    await queryRunner.release();
  }, 60_000);

  afterEach(async () => {
    await dataSource.query('DELETE FROM public.animales');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('registra un animal con solo los campos obligatorios', async () => {
    await insertar('nombre, especie', ['Rocky', 'perro']);

    const [fila] = await dataSource.query(
      'SELECT adoptado, eliminado_en FROM public.animales',
    );
    expect(fila).toEqual({ adoptado: false, eliminado_en: null });
  });

  it('rechaza nombre vacío, especie y sexo inválidos', async () => {
    await expect(
      insertar('nombre, especie', ['  ', 'perro']),
    ).rejects.toThrow();
    await expect(
      insertar('nombre, especie', ['Rocky', 'ave']),
    ).rejects.toThrow();
    await expect(
      insertar('nombre, especie, sexo', ['Rocky', 'perro', 'otro']),
    ).rejects.toThrow();
  });

  it('exige unidad cuando hay edad y rechaza edades negativas', async () => {
    await insertar('nombre, especie, edad, edad_unidad', [
      'Misu',
      'gato',
      3,
      'meses',
    ]);
    await expect(
      insertar('nombre, especie, edad', ['Misu', 'gato', 3]),
    ).rejects.toThrow();
    await expect(
      insertar('nombre, especie, edad_unidad', ['Misu', 'gato', 'anios']),
    ).rejects.toThrow();
    await expect(
      insertar('nombre, especie, edad, edad_unidad', [
        'Misu',
        'gato',
        -1,
        'anios',
      ]),
    ).rejects.toThrow();
  });

  it('rechaza datos de adopción cuando el animal no está adoptado', async () => {
    await expect(
      insertar('nombre, especie, nombre_adoptante', [
        'Rocky',
        'perro',
        'Ana Pérez',
      ]),
    ).rejects.toThrow();
    await expect(
      insertar(
        'nombre, especie, foto_entrega_ruta, foto_entrega_content_type, foto_entrega_tamano',
        ['Rocky', 'perro', 'entregas/a.jpg', 'image/jpeg', 10],
      ),
    ).rejects.toThrow();

    await insertar(
      'nombre, especie, adoptado, nombre_adoptante, direccion_adoptante, fecha_adopcion',
      ['Rocky', 'perro', true, 'Ana Pérez', 'Calle 1', '2026-11-01'],
    );
  });

  it('exige completas las tres columnas de cada foto y rutas únicas', async () => {
    await expect(
      insertar('nombre, especie, foto_animal_ruta', [
        'Rocky',
        'perro',
        'animales/a.jpg',
      ]),
    ).rejects.toThrow();

    const foto = ['Rocky', 'perro', 'animales/a.jpg', 'image/jpeg', 10];
    const columnas =
      'nombre, especie, foto_animal_ruta, foto_animal_content_type, foto_animal_tamano';
    await insertar(columnas, foto);
    await expect(insertar(columnas, foto)).rejects.toThrow();
  });
});
