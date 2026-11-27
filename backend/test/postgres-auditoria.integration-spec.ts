import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CrearEsquemaBase1729000000000 } from '../src/database/migrations/1729000000000-CrearEsquemaBase.js';
import { CrearTablaSesionesAdmin1730000000000 } from '../src/database/migrations/1730000000000-CrearTablaSesionesAdmin.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';
import { AgregarBorradoLogicoCampanas1733000000000 } from '../src/database/migrations/1733000000000-AgregarBorradoLogicoCampanas.js';
import { CrearTablaHistorias1734000000000 } from '../src/database/migrations/1734000000000-CrearTablaHistorias.js';
import { ExigirUnidadDeEdad1735000000000 } from '../src/database/migrations/1735000000000-ExigirUnidadDeEdad.js';
import { QuitarAuditoriaDuplicada1736000000000 } from '../src/database/migrations/1736000000000-QuitarAuditoriaDuplicada.js';
import { DATABASE_ENTITIES } from '../src/database/database-options.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { CampanasAdminService } from '../src/modules/campanas/campanas-admin.service.js';
import { CanalContacto } from '../src/modules/canales-contacto/entities/canal-contacto.entity.js';
import { CanalesContactoAdminService } from '../src/modules/canales-contacto/canales-contacto-admin.service.js';
import { DatoDonacion } from '../src/modules/donaciones/entities/dato-donacion.entity.js';
import { DonacionesAdminService } from '../src/modules/donaciones/donaciones-admin.service.js';
import type { StorageService } from '../src/modules/storage/storage.service.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

function conexion(base: string): DataSource {
  const url = new URL(URL_PRUEBAS as string);
  url.pathname = `/${base}`;
  return new DataSource({
    type: 'postgres',
    url: url.toString(),
    ssl: CA_PRUEBAS ? { rejectUnauthorized: true } : false,
    entities: DATABASE_ENTITIES,
    migrations: [
      CrearEsquemaBase1729000000000,
      CrearTablaSesionesAdmin1730000000000,
      CrearTablaFotosCampana1731000000000,
      CrearTablaAnimales1732000000000,
      AgregarBorradoLogicoCampanas1733000000000,
      CrearTablaHistorias1734000000000,
      ExigirUnidadDeEdad1735000000000,
      QuitarAuditoriaDuplicada1736000000000,
    ],
    synchronize: false,
    migrationsRun: false,
  });
}

/** Con el esquema migrado, cada cambio del panel queda auditado una vez. */
describe.skipIf(!URL_PRUEBAS)('auditoría sin duplicados (integración)', () => {
  const nombreBase = `fenix_auditoria_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const adminId = randomUUID();
  let administracion: DataSource;
  let base: DataSource;

  const auditadas = (tabla: string) =>
    base.query(
      `SELECT accion, administrador_id AS administrador
         FROM public.auditoria WHERE tabla = $1`,
      [tabla],
    );

  beforeAll(async () => {
    administracion = conexion(new URL(URL_PRUEBAS as string).pathname.slice(1));
    await administracion.initialize();
    await administracion.query(`CREATE DATABASE ${nombreBase}`);

    base = conexion(nombreBase);
    await base.initialize();
    await base.runMigrations();
    await base.query(
      `INSERT INTO public.administradores (id, email, nombre)
       VALUES ($1, 'auditoria@fundacionfenix.org', 'Auditoría')`,
      [adminId],
    );
  }, 60_000);

  afterAll(async () => {
    if (base?.isInitialized) await base.destroy();
    if (administracion?.isInitialized) {
      await administracion.query(
        `DROP DATABASE IF EXISTS ${nombreBase} WITH (FORCE)`,
      );
      await administracion.destroy();
    }
  }, 60_000);

  it('registra una sola fila al crear una campaña', async () => {
    const campanas = new CampanasAdminService(
      base.getRepository(Campana),
      base,
      base.getRepository(FotoCampana),
      {} as StorageService,
    );

    await campanas.crear({ tituloEs: 'Campaña', estado: 'borrador' }, adminId);

    expect(await auditadas('campanas')).toEqual([
      { accion: 'INSERT', administrador: adminId },
    ]);
  });

  it('registra una sola fila al actualizar un canal de contacto', async () => {
    await base.query(
      `INSERT INTO public.canales_contacto (tipo, url, orden, activo)
       VALUES ('whatsapp', 'https://wa.me/1', 1, true)
       ON CONFLICT (tipo) DO NOTHING`,
    );
    const canales = new CanalesContactoAdminService(
      base.getRepository(CanalContacto),
      base,
    );

    await canales.actualizar(
      'whatsapp',
      { url: 'https://wa.me/2', activo: true },
      adminId,
    );

    expect(await auditadas('canales_contacto')).toEqual([
      { accion: 'UPDATE', administrador: adminId },
    ]);
  });

  it('registra una sola fila al guardar los datos de donación', async () => {
    const donaciones = new DonacionesAdminService(
      base.getRepository(DatoDonacion),
      base,
      {
        obtenerUrlPublica: (ruta: string) => `https://storage.example/${ruta}`,
      } as StorageService,
    );

    await donaciones.guardar(
      {
        titular: 'Titular',
        banco: 'Banco',
        telefono: '+591 70000000',
        referencia: 'Prueba',
        numeroCuenta: '000-000',
        avisoEs: 'Aviso',
        avisoEn: 'Notice',
      },
      adminId,
    );

    expect(await auditadas('datos_donacion')).toEqual([
      { accion: 'INSERT', administrador: adminId },
    ]);
  });

  it('se puede revertir y volver a aplicar', async () => {
    const contar = async () => {
      const [{ n }] = await base.query(
        `SELECT count(*)::int AS n FROM pg_trigger
          WHERE tgname IN ('trg_campanas_auditoria',
            'trg_canales_contacto_auditoria', 'trg_datos_donacion_auditoria')`,
      );
      return n as number;
    };
    const migracion = new QuitarAuditoriaDuplicada1736000000000();
    const queryRunner = base.createQueryRunner();

    await migracion.down(queryRunner);
    expect(await contar()).toBe(3);
    await migracion.up(queryRunner);
    expect(await contar()).toBe(0);

    await queryRunner.release();
  });
});
