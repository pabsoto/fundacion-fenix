import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATABASE_ENTITIES } from '../src/database/database-options.js';
import { CrearEsquemaBase1729000000000 } from '../src/database/migrations/1729000000000-CrearEsquemaBase.js';
import { CrearTablaSesionesAdmin1730000000000 } from '../src/database/migrations/1730000000000-CrearTablaSesionesAdmin.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';
import { AgregarBorradoLogicoCampanas1733000000000 } from '../src/database/migrations/1733000000000-AgregarBorradoLogicoCampanas.js';
import { ResumenAdminService } from '../src/modules/admin/resumen-admin.service.js';
import { AnimalesAdminService } from '../src/modules/animales/animales-admin.service.js';
import { Animal } from '../src/modules/animales/entities/animal.entity.js';
import { FotosAnimalService } from '../src/modules/animales/fotos-animal.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
import { FotosCampanaService } from '../src/modules/campanas/fotos-campana.service.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;

function conexion(base: string, completa: boolean): DataSource {
  const url = new URL(URL_PRUEBAS as string);
  url.pathname = `/${base}`;
  return new DataSource({
    type: 'postgres',
    url: url.toString(),
    ssl: CA_PRUEBAS ? { rejectUnauthorized: true } : false,
    ...(completa
      ? {
          entities: DATABASE_ENTITIES,
          migrations: [
            CrearEsquemaBase1729000000000,
            CrearTablaSesionesAdmin1730000000000,
            CrearTablaFotosCampana1731000000000,
            CrearTablaAnimales1732000000000,
            AgregarBorradoLogicoCampanas1733000000000,
          ],
        }
      : {}),
    synchronize: false,
    migrationsRun: false,
  });
}

/** «Hoy» en la zona horaria del panel, para fabricar fechas relativas. */
const HOY = `(now() at time zone 'America/La_Paz')::date`;
const INICIO_ANIO = `date_trunc('year', ${HOY}::timestamp)::date`;
const INICIO_MES = `date_trunc('month', ${HOY}::timestamp)::date`;

describe.skipIf(!URL_PRUEBAS)(
  'animales, fotos de campaña y resumen en PostgreSQL (integración)',
  () => {
    const nombreBase = `fenix_resumen_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const adminId = randomUUID();
    let administracion: DataSource;
    let base: DataSource;
    let animales: AnimalesAdminService;
    let fotosAnimal: FotosAnimalService;
    let fotosCampana: FotosCampanaService;
    let resumen: ResumenAdminService;

    const eliminados: string[] = [];
    const storage = {
      eliminar: async (ruta: string) => {
        eliminados.push(ruta);
      },
      subir: async () => undefined,
      crearUrlFirmada: async (ruta: string) => `https://firmada.test/${ruta}`,
      obtenerUrlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
    } as unknown as StorageService;

    beforeAll(async () => {
      administracion = conexion(
        new URL(URL_PRUEBAS as string).pathname.slice(1),
        false,
      );
      await administracion.initialize();
      await administracion.query(`CREATE DATABASE ${nombreBase}`);

      base = conexion(nombreBase, true);
      await base.initialize();
      await base.runMigrations();
      await base.query(
        `INSERT INTO public.administradores (id, email, nombre)
         VALUES ($1, 'resumen@fundacionfenix.org', 'Resumen')`,
        [adminId],
      );

      animales = new AnimalesAdminService(
        base.getRepository(Animal),
        base,
        storage,
      );
      fotosAnimal = new FotosAnimalService(base.getRepository(Animal), storage);
      fotosCampana = new FotosCampanaService(
        base.getRepository(Campana),
        base.getRepository(FotoCampana),
        storage,
      );
      resumen = new ResumenAdminService(base);
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

    const datos = {
      nombre: 'Luna',
      especie: 'perro' as const,
      sexo: 'hembra' as const,
      edad: 2,
      edadUnidad: 'anios' as const,
      fechaIngreso: '2025-03-12',
      adoptado: false,
    };

    describe('editar, eliminar y quitar fotos de animales', () => {
      it('actualiza un animal y al dejar de estar adoptado limpia la foto de la entrega', async () => {
        const animal = await animales.registrar(
          {
            ...datos,
            adoptado: true,
            nombreAdoptante: 'Carla Mamani',
            direccionAdoptante: 'Calle 5',
            fechaAdopcion: '2025-04-01',
          },
          adminId,
        );
        await base.query(
          `UPDATE public.animales
              SET foto_entrega_ruta = 'entregas/prueba.jpg',
                  foto_entrega_content_type = 'image/jpeg',
                  foto_entrega_tamano = 100
            WHERE id = $1`,
          [animal.id],
        );

        const actualizado = await animales.actualizar(
          animal.id,
          { ...datos, nombre: 'Luna II' },
          adminId,
        );

        expect(actualizado).toMatchObject({
          nombre: 'Luna II',
          adoptado: false,
          nombreAdoptante: null,
          tieneFotoEntrega: false,
        });
        expect(eliminados).toContain('entregas/prueba.jpg');
        const [auditoria] = await base.query(
          `SELECT accion FROM public.auditoria
            WHERE tabla = 'animales' AND registro_id = $1 AND accion = 'UPDATE'`,
          [animal.id],
        );
        expect(auditoria.accion).toBe('UPDATE');
      });

      it('quita la foto de un animal y deja las tres columnas en nulo', async () => {
        const animal = await animales.registrar(datos, adminId);
        await base.query(
          `UPDATE public.animales
              SET foto_animal_ruta = 'animales/prueba.jpg',
                  foto_animal_content_type = 'image/jpeg',
                  foto_animal_tamano = 100
            WHERE id = $1`,
          [animal.id],
        );

        await fotosAnimal.quitar('animal', animal.id, adminId);

        const [fila] = await base.query(
          `SELECT foto_animal_ruta, foto_animal_content_type, foto_animal_tamano
             FROM public.animales WHERE id = $1`,
          [animal.id],
        );
        expect(fila).toEqual({
          foto_animal_ruta: null,
          foto_animal_content_type: null,
          foto_animal_tamano: null,
        });
        expect(eliminados).toContain('animales/prueba.jpg');
        await expect(
          fotosAnimal.quitar('animal', animal.id, adminId),
        ).rejects.toBeInstanceOf(NotFoundException);
      });

      it('al eliminar un animal deja de aparecer, pero el registro se conserva', async () => {
        const animal = await animales.registrar(datos, adminId);

        await animales.eliminar(animal.id, adminId);

        await expect(animales.obtener(animal.id)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        const { items: lista } = await animales.listar({ limite: 50 });
        expect(lista.find((item) => item.id === animal.id)).toBeUndefined();
        const [fila] = await base.query(
          `SELECT eliminado_en, eliminado_por FROM public.animales WHERE id = $1`,
          [animal.id],
        );
        expect(fila.eliminado_en).not.toBeNull();
        expect(fila.eliminado_por).toBe(adminId);
        await expect(
          animales.eliminar(animal.id, adminId),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe('fotos de campaña', () => {
      async function campanaConFotos(estado: 'publicada' | 'cerrada') {
        const [campana] = await base.query(
          `INSERT INTO public.campanas
             (titulo_es, estado, fecha, lugar, perros_machos, creado_por)
           VALUES ('Con fotos', $1, '2026-03-14', 'El Alto', 3, $2)
           RETURNING id`,
          [estado, adminId],
        );
        const ids: string[] = [];
        for (const orden of [1, 2, 3]) {
          const [foto] = await base.query(
            `INSERT INTO public.fotos_campana (campana_id, ruta, content_type, tamano, orden, creado_por)
             VALUES ($1, $2, 'image/webp', 10, $3, $4) RETURNING id`,
            [campana.id, `campanas/${campana.id}/${orden}.webp`, orden, adminId],
          );
          ids.push(foto.id);
        }
        return { campanaId: campana.id as string, ids };
      }

      it('reordena la galería y el nuevo orden queda en la base', async () => {
        const { campanaId, ids } = await campanaConFotos('publicada');

        const resultado = await fotosCampana.reordenar(campanaId, [
          ids[2],
          ids[0],
          ids[1],
        ]);

        expect(resultado.map((foto) => foto.id)).toEqual([ids[2], ids[0], ids[1]]);
        const filas = await base.query(
          `SELECT id FROM public.fotos_campana WHERE campana_id = $1 ORDER BY orden`,
          [campanaId],
        );
        expect(filas.map((fila: { id: string }) => fila.id)).toEqual([
          ids[2],
          ids[0],
          ids[1],
        ]);
      });

      it('quita una foto de la base y de Storage', async () => {
        const { campanaId, ids } = await campanaConFotos('publicada');

        await fotosCampana.quitar(campanaId, ids[1]);

        const filas = await base.query(
          `SELECT id FROM public.fotos_campana WHERE campana_id = $1`,
          [campanaId],
        );
        expect(filas).toHaveLength(2);
        expect(eliminados).toContain(`campanas/${campanaId}/2.webp`);
      });

      it('no modifica las fotos de una campaña cerrada', async () => {
        const { campanaId, ids } = await campanaConFotos('cerrada');

        await expect(fotosCampana.quitar(campanaId, ids[0])).rejects.toBeInstanceOf(
          ConflictException,
        );
        await expect(
          fotosCampana.reordenar(campanaId, [...ids].reverse()),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });

    describe('resumen', () => {
      beforeAll(async () => {
        // Parte de una base sin animales ni campañas de las pruebas anteriores.
        await base.query(`DELETE FROM public.animales`);
        await base.query(`DELETE FROM public.fotos_campana`);
        await base.query(`ALTER TABLE public.campanas DISABLE TRIGGER trg_campanas_no_borrar_cerradas`);
        await base.query(`DELETE FROM public.campanas`);
        await base.query(`ALTER TABLE public.campanas ENABLE TRIGGER trg_campanas_no_borrar_cerradas`);

        await base.query(
          `INSERT INTO public.campanas (titulo_es, estado, perros_machos, gatos_hembras, creado_por)
           VALUES ('Borrador', 'borrador', 5, 0, $1)`,
          [adminId],
        );
        await base.query(
          `INSERT INTO public.campanas (titulo_es, estado, fecha, lugar, perros_hembras, gatos_machos, creado_por)
           VALUES ('Publicada', 'publicada', '2026-03-14', 'El Alto', 6, 4, $1)`,
          [adminId],
        );

        const insertar = (
          nombre: string,
          especie: string,
          adoptado: boolean,
          ingreso: string | null,
          adopcion: string | null,
          eliminado = false,
        ) =>
          base.query(
            `INSERT INTO public.animales
               (nombre, especie, adoptado, fecha_ingreso, fecha_adopcion,
                nombre_adoptante, direccion_adoptante, eliminado_en)
             VALUES ($1, $2, $3, ${ingreso}, ${adopcion},
                     ${adoptado ? "'Alguien'" : 'NULL'}, ${adoptado ? "'Calle 1'" : 'NULL'},
                     ${eliminado ? 'now()' : 'NULL'})`,
            [nombre, especie, adoptado],
          );

        // Adoptados: dos este año (50 y 100 días) y uno el año pasado (100 días).
        await insertar('Adoptado A', 'perro', true, `${INICIO_ANIO} - 50`, `${INICIO_ANIO}`);
        await insertar('Adoptado B', 'gato', true, `${INICIO_ANIO} - 100`, `${INICIO_ANIO}`);
        await insertar('Adoptado C', 'perro', true, `${INICIO_ANIO} - 400`, `${INICIO_ANIO} - 300`);
        // En la fundación, del más antiguo al más reciente.
        await insertar('Espera 1', 'gato', false, `${HOY} - 300`, 'NULL');
        await insertar('Espera 2', 'perro', false, `${HOY} - 200`, 'NULL');
        await insertar('Espera 3', 'perro', false, `${HOY} - 100`, 'NULL');
        await insertar('Espera 4', 'gato', false, `${INICIO_MES} - 1`, 'NULL');
        await insertar('Espera 5', 'perro', false, `${HOY}`, 'NULL');
        // Sin fecha de ingreso: cuenta como registrado y en la fundación, pero no espera.
        await insertar('Sin fecha', 'perro', false, 'NULL', 'NULL');
        // Eliminado: no cuenta en nada.
        await insertar('Eliminado', 'perro', false, `${HOY} - 400`, 'NULL', true);
      });

      it('suma las esterilizaciones de todas las campañas', async () => {
        const { esterilizaciones } = await resumen.obtener();

        expect(esterilizaciones).toEqual({ total: 15, jornadas: 2 });
      });

      it('cuenta los animales registrados y los que siguen en la fundación sin contar los eliminados', async () => {
        const { enLaFundacion } = await resumen.obtener();

        expect(enLaFundacion).toEqual({ cantidad: 6, registrados: 9 });
      });

      it('cuenta las adopciones del año en curso', async () => {
        const [{ anio }] = await base.query(`SELECT extract(year from ${HOY})::int AS anio`);

        const { adopcionesDelAnio } = await resumen.obtener();

        expect(adopcionesDelAnio).toEqual({ cantidad: 2, anio });
      });

      it('promedia los días entre ingreso y adopción', async () => {
        const { diasHastaAdoptar } = await resumen.obtener();

        // (50 + 100 + 100) / 3 = 83,33
        expect(diasHastaAdoptar).toBe(83);
      });

      it('lista a lo sumo 4 animales en espera, del ingreso más antiguo', async () => {
        const { espera } = await resumen.obtener();

        expect(espera.map((animal) => animal.nombre)).toEqual([
          'Espera 1',
          'Espera 2',
          'Espera 3',
          'Espera 4',
        ]);
        expect(espera[0]).toMatchObject({ especie: 'gato', dias: 300 });
        expect(espera[2].dias).toBe(100);
      });

      it('entrega doce meses consecutivos terminando en el mes actual', async () => {
        const { serie } = await resumen.obtener();
        const [{ anio, mes }] = await base.query(
          `SELECT extract(year from ${HOY})::int AS anio, extract(month from ${HOY})::int AS mes`,
        );

        expect(serie).toHaveLength(12);
        expect(serie[11]).toMatchObject({ anio, mes });
        const indices = serie.map((punto) => punto.anio * 12 + punto.mes);
        indices.slice(1).forEach((indice, posicion) => {
          expect(indice).toBe(indices[posicion] + 1);
        });
        // Espera 5 ingresó hoy y Espera 4 el último día del mes anterior.
        expect(serie[11].ingresos).toBeGreaterThanOrEqual(1);
        expect(serie[10].ingresos).toBeGreaterThanOrEqual(1);
      });

      it('devuelve nulo y listas vacías sin animales', async () => {
        await base.query(`UPDATE public.animales SET eliminado_en = now()`);

        const vacio = await resumen.obtener();

        expect(vacio.diasHastaAdoptar).toBeNull();
        expect(vacio.espera).toEqual([]);
        expect(vacio.enLaFundacion).toEqual({ cantidad: 0, registrados: 0 });
        expect(vacio.serie).toHaveLength(12);
        expect(vacio.serie.every((punto) => punto.ingresos === 0)).toBe(true);
      });
    });
  },
);
