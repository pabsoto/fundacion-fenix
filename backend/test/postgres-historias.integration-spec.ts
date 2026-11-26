import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CrearEsquemaBase1729000000000 } from '../src/database/migrations/1729000000000-CrearEsquemaBase.js';
import { CrearTablaSesionesAdmin1730000000000 } from '../src/database/migrations/1730000000000-CrearTablaSesionesAdmin.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';
import { AgregarBorradoLogicoCampanas1733000000000 } from '../src/database/migrations/1733000000000-AgregarBorradoLogicoCampanas.js';
import { CrearTablaHistorias1734000000000 } from '../src/database/migrations/1734000000000-CrearTablaHistorias.js';
import { Administrador } from '../src/modules/administradores/entities/administrador.entity.js';
import { Historia } from '../src/modules/historias/entities/historia.entity.js';
import { FotosHistoriaService } from '../src/modules/historias/fotos-historia.service.js';
import { HistoriasAdminService } from '../src/modules/historias/historias-admin.service.js';
import type { StorageService } from '../src/modules/storage/storage.service.js';
import { crearJpg } from './utils/imagenes.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

const MIGRACIONES = [
  CrearEsquemaBase1729000000000,
  CrearTablaSesionesAdmin1730000000000,
  CrearTablaFotosCampana1731000000000,
  CrearTablaAnimales1732000000000,
  AgregarBorradoLogicoCampanas1733000000000,
  CrearTablaHistorias1734000000000,
];

function conexion(base: string): DataSource {
  const url = new URL(URL_PRUEBAS as string);
  url.pathname = `/${base}`;
  return new DataSource({
    type: 'postgres',
    url: url.toString(),
    ssl: CA_PRUEBAS ? { rejectUnauthorized: true } : false,
    entities: [Administrador, Historia],
    migrations: MIGRACIONES,
    synchronize: false,
    migrationsRun: false,
  });
}

const BASE = {
  animal_nombre: 'Luna',
  titulo_es: 'Luna encontró un hogar',
  titulo_en: 'Luna found a home',
  texto_es: 'Texto de la historia',
  texto_en: 'Story text',
  fecha_historia: '2026-10-01',
};

describe.skipIf(!URL_PRUEBAS)('historias en PostgreSQL (integración)', () => {
  const nombreBase = `fenix_historias_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  let administracion: DataSource;
  let dataSource: DataSource;

  const insertar = (datos: Record<string, unknown>) => {
    const columnas = Object.keys(datos);

    return dataSource.query(
      `INSERT INTO public.historias (${columnas.join(', ')})
       VALUES (${columnas.map((_, indice) => `$${indice + 1}`).join(', ')})`,
      Object.values(datos),
    );
  };

  beforeAll(async () => {
    administracion = conexion(new URL(URL_PRUEBAS as string).pathname.slice(1));
    await administracion.initialize();
    await administracion.query(`CREATE DATABASE ${nombreBase}`);

    dataSource = conexion(nombreBase);
    await dataSource.initialize();
    await dataSource.runMigrations();
  }, 60_000);

  afterEach(async () => {
    await dataSource.query('DELETE FROM public.historias');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (administracion?.isInitialized) {
      await administracion.query(
        `DROP DATABASE IF EXISTS ${nombreBase} WITH (FORCE)`,
      );
      await administracion.destroy();
    }
  }, 60_000);

  it('registra una historia con los campos obligatorios y valores por defecto', async () => {
    await insertar(BASE);

    const [fila] = await dataSource.query(
      'SELECT orden, visible, autor_nombre, foto_ruta, eliminado_en FROM public.historias',
    );
    expect(fila).toEqual({
      orden: 0,
      visible: false,
      autor_nombre: null,
      foto_ruta: null,
      eliminado_en: null,
    });
  });

  it('rechaza campos obligatorios vacíos o sin fecha', async () => {
    for (const campo of [
      'animal_nombre',
      'titulo_es',
      'titulo_en',
      'texto_es',
      'texto_en',
    ]) {
      await expect(insertar({ ...BASE, [campo]: '   ' })).rejects.toThrow();
    }
    await expect(insertar({ ...BASE, fecha_historia: null })).rejects.toThrow();
  });

  it('rechaza un autor vacío y un orden negativo', async () => {
    await expect(insertar({ ...BASE, autor_nombre: ' ' })).rejects.toThrow();
    await expect(insertar({ ...BASE, orden: -1 })).rejects.toThrow();
  });

  it('exige que la foto se guarde completa, con dimensiones válidas', async () => {
    await expect(
      insertar({ ...BASE, foto_ruta: 'historias/a.webp' }),
    ).rejects.toThrow();
    await expect(
      insertar({
        ...BASE,
        foto_ruta: 'historias/a.webp',
        foto_content_type: 'image/webp',
        foto_tamano: 1000,
        foto_ancho: 0,
        foto_alto: 600,
      }),
    ).rejects.toThrow();

    await insertar({
      ...BASE,
      foto_ruta: 'historias/a.webp',
      foto_content_type: 'image/webp',
      foto_tamano: 1000,
      foto_ancho: 800,
      foto_alto: 600,
    });
  });

  it('no permite repetir la ruta de la foto', async () => {
    const foto = {
      foto_ruta: 'historias/b.webp',
      foto_content_type: 'image/webp',
      foto_tamano: 1000,
      foto_ancho: 800,
      foto_alto: 600,
    };

    await insertar({ ...BASE, ...foto });
    await expect(insertar({ ...BASE, ...foto })).rejects.toThrow();
  });

  it('actualiza actualizado_en al modificar y registra el cambio en auditoría', async () => {
    await insertar(BASE);
    const [antes] = await dataSource.query(
      'SELECT id, actualizado_en FROM public.historias',
    );

    await dataSource.query(
      'UPDATE public.historias SET visible = true WHERE id = $1',
      [antes.id],
    );

    const [despues] = await dataSource.query(
      'SELECT actualizado_en FROM public.historias WHERE id = $1',
      [antes.id],
    );
    const [auditoria] = await dataSource.query(
      `SELECT count(*)::int AS total FROM public.auditoria
        WHERE tabla = 'historias' AND registro_id = $1 AND accion = 'UPDATE'`,
      [antes.id],
    );

    expect(new Date(despues.actualizado_en).getTime()).toBeGreaterThanOrEqual(
      new Date(antes.actualizado_en).getTime(),
    );
    expect(auditoria.total).toBe(1);
  });

  it('audita cada escritura del panel una sola vez y con su administrador', async () => {
    const [{ id: administradorId }] = await dataSource.query(
      `INSERT INTO public.administradores (email, nombre)
       VALUES ('historias@fenix.test', 'Administración') RETURNING id`,
    );
    const storage = {
      subir: async () => undefined,
      eliminar: async () => undefined,
      obtenerUrlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
    } as unknown as StorageService;
    const repositorio = dataSource.getRepository(Historia);
    const historias = new HistoriasAdminService(
      repositorio,
      dataSource,
      storage,
    );
    const fotos = new FotosHistoriaService(repositorio, dataSource, storage);
    const entrada = {
      animalNombre: 'Luna',
      tituloEs: 'Título',
      tituloEn: 'Title',
      textoEs: 'Texto',
      textoEn: 'Text',
      fechaHistoria: '2026-10-01',
    };
    const jpg = crearJpg(1600, 900, 6);

    const primera = await historias.crear(entrada, administradorId);
    const segunda = await historias.crear(entrada, administradorId);
    const conFoto = await fotos.subir(
      primera.id,
      { buffer: jpg, mimetype: 'image/jpeg', size: jpg.length },
      administradorId,
    );
    await historias.actualizar(
      primera.id,
      { ...entrada, visible: true },
      administradorId,
    );
    await historias.reordenar([segunda.id, primera.id], administradorId);
    await historias.eliminar(primera.id, administradorId);

    expect([primera.orden, segunda.orden]).toEqual([1, 2]);
    expect(conFoto.fechaHistoria).toBe('2026-10-01');
    expect(conFoto.foto).toMatchObject({ ancho: 900, alto: 1600 });
    expect((await historias.listar()).map((h) => h.id)).toEqual([segunda.id]);

    const registros: Array<{
      administrador_id: string;
      accion: string;
      campos_modificados: string[];
    }> = await dataSource.query(
      `SELECT administrador_id, accion, campos_modificados
         FROM public.auditoria
        WHERE tabla = 'historias' AND registro_id = $1
        ORDER BY creado_en`,
      [primera.id],
    );
    // Alta, foto, publicación, reordenamiento y borrado lógico.
    expect(registros.map((registro) => registro.accion)).toEqual([
      'INSERT',
      'UPDATE',
      'UPDATE',
      'UPDATE',
      'UPDATE',
    ]);
    expect(registros.every((r) => r.administrador_id === administradorId)).toBe(
      true,
    );
    expect(registros[3].campos_modificados).toContain('orden');
    expect(registros[4].campos_modificados).toEqual(
      expect.arrayContaining(['eliminado_en', 'foto_ruta', 'visible']),
    );
  });

  it('conserva la fila con borrado lógico', async () => {
    await insertar(BASE);
    await dataSource.query('UPDATE public.historias SET eliminado_en = now()');

    const [fila] = await dataSource.query(
      'SELECT count(*)::int AS total FROM public.historias',
    );
    expect(fila.total).toBe(1);
  });
});
