import { DataSource } from 'typeorm';
import {
  createDatabaseOptions,
  createNestTypeOrmOptions,
  DATABASE_ENTITIES,
} from './database-options.js';

const testEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres',
};

describe('database configuration', () => {
  it('disables every automatic schema mutation', () => {
    const options = createNestTypeOrmOptions(testEnvironment);

    expect(options).toMatchObject({
      type: 'postgres',
      schema: 'public',
      synchronize: false,
      dropSchema: false,
      migrationsRun: false,
      installExtensions: false,
      manualInitialization: true,
      autoLoadEntities: false,
    });
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true });
  });

  it('rejects URL parameters that pg would use to replace the TLS object', () => {
    expect(() =>
      createDatabaseOptions({
        DATABASE_URL:
          'postgresql://user:password@localhost:5432/postgres?sslmode=require',
      }),
    ).toThrow('DATABASE_URL no debe contener parámetros SSL');
  });

  it('builds metadata for the five existing tables without connecting', async () => {
    const dataSource = new DataSource(createDatabaseOptions(testEnvironment));
    const metadataBuilder = dataSource as DataSource & {
      buildMetadatas(): Promise<void>;
    };

    await metadataBuilder.buildMetadatas();

    expect(dataSource.isInitialized).toBe(false);
    expect(
      dataSource.entityMetadatas.map(({ tableName }) => tableName).sort(),
    ).toEqual([
      'administradores',
      'auditoria',
      'canales_contacto',
      'contenido_institucional',
      'datos_donacion',
    ]);
    expect(DATABASE_ENTITIES).toHaveLength(5);

    const expectedColumns: Record<string, string[]> = {
      administradores: [
        'activo',
        'actualizado_en',
        'creado_en',
        'email',
        'google_sub',
        'id',
        'nombre',
        'ultimo_acceso',
      ],
      auditoria: [
        'accion',
        'administrador_id',
        'campos_modificados',
        'creado_en',
        'datos_antes',
        'datos_despues',
        'id',
        'registro_id',
        'tabla',
      ],
      canales_contacto: [
        'activo',
        'actualizado_en',
        'actualizado_por',
        'creado_en',
        'id',
        'orden',
        'texto_en',
        'texto_es',
        'tipo',
        'url',
      ],
      contenido_institucional: [
        'actualizado_en',
        'actualizado_por',
        'clave',
        'creado_en',
        'id',
        'imagen_ruta',
        'orden',
        'texto_en',
        'texto_es',
        'titulo_en',
        'titulo_es',
        'visible',
      ],
      datos_donacion: [
        'activo',
        'actualizado_en',
        'actualizado_por',
        'aviso_en',
        'aviso_es',
        'banco',
        'creado_en',
        'creado_por',
        'id',
        'numero_cuenta',
        'qr_ruta',
        'qr_vence_el',
        'referencia',
        'telefono',
        'titular',
      ],
    };

    for (const [tableName, columnNames] of Object.entries(expectedColumns)) {
      expect(
        dataSource
          .getMetadata(tableName)
          .columns.map(({ databaseName }) => databaseName)
          .sort(),
      ).toEqual(columnNames);
    }

    const donationMetadata = dataSource.getMetadata('datos_donacion');
    expect(
      donationMetadata.columns.find(
        ({ databaseName }) => databaseName === 'qr_vence_el',
      )?.type,
    ).toBe('date');

    const auditMetadata = dataSource.getMetadata('auditoria');
    expect(
      auditMetadata.columns.find(
        ({ databaseName }) => databaseName === 'campos_modificados',
      )?.isArray,
    ).toBe(true);

    for (const metadata of dataSource.entityMetadatas) {
      const id = metadata.columns.find(
        ({ databaseName }) => databaseName === 'id',
      );
      expect(id?.default).toBeTypeOf('function');
    }

    expect(
      dataSource.entityMetadatas.flatMap(({ foreignKeys }) =>
        foreignKeys.map(({ onDelete }) => onDelete),
      ),
    ).toEqual(['RESTRICT', 'RESTRICT', 'RESTRICT', 'RESTRICT', 'RESTRICT']);

    expect(
      dataSource.entityMetadatas
        .flatMap(({ checks }) => checks.map(({ name }) => name))
        .sort(),
    ).toEqual([
      'ck_administradores_email_minuscula',
      'ck_administradores_nombre_no_vacio',
      'ck_auditoria_accion',
      'ck_canales_tipo',
      'ck_canales_url_segura',
      'ck_contenido_clave_formato',
    ]);

    expect(
      dataSource.entityMetadatas
        .flatMap(({ indices }) => indices.map(({ name }) => name))
        .sort(),
    ).toEqual([
      'ix_auditoria_creado_en',
      'ix_auditoria_tabla_registro',
      'ux_datos_donacion_un_solo_activo',
    ]);
  });
});
