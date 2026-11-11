import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATABASE_ENTITIES } from '../src/database/database-options.js';
import { CrearEsquemaBase1729000000000 } from '../src/database/migrations/1729000000000-CrearEsquemaBase.js';
import { CrearTablaSesionesAdmin1730000000000 } from '../src/database/migrations/1730000000000-CrearTablaSesionesAdmin.js';
import { CrearTablaFotosCampana1731000000000 } from '../src/database/migrations/1731000000000-CrearTablaFotosCampana.js';
import { CrearTablaAnimales1732000000000 } from '../src/database/migrations/1732000000000-CrearTablaAnimales.js';
import { AgregarBorradoLogicoCampanas1733000000000 } from '../src/database/migrations/1733000000000-AgregarBorradoLogicoCampanas.js';
import { AnimalesAdminService } from '../src/modules/animales/animales-admin.service.js';
import { Animal } from '../src/modules/animales/entities/animal.entity.js';
import { CampanasAdminService } from '../src/modules/campanas/campanas-admin.service.js';
import { Campana } from '../src/modules/campanas/entities/campana.entity.js';
import { FotoCampana } from '../src/modules/campanas/entities/foto-campana.entity.js';
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

describe.skipIf(!URL_PRUEBAS)(
  'paginación, filtros y eliminación de campañas en PostgreSQL (integración)',
  () => {
    const nombreBase = `fenix_pagina_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const adminId = randomUUID();
    let administracion: DataSource;
    let base: DataSource;
    let campanas: CampanasAdminService;
    let animales: AnimalesAdminService;

    const eliminados: string[] = [];
    const storage = {
      eliminar: async (ruta: string) => {
        eliminados.push(ruta);
      },
      obtenerUrlPublica: (ruta: string) => `https://cdn.test/${ruta}`,
    } as unknown as StorageService;

    async function crearCampana(
      fecha: string | null,
      estado: string,
      perrosMachos = 0,
      gatosHembras = 0,
    ): Promise<string> {
      const id = randomUUID();
      await base.query(
        `INSERT INTO public.campanas
           (id, titulo_es, lugar, fecha, estado, perros_machos, gatos_hembras)
         VALUES ($1, $2, 'El Alto', $3, $4, $5, $6)`,
        [id, `Campaña ${fecha ?? 'sin fecha'}`, fecha, estado, perrosMachos, gatosHembras],
      );
      return id;
    }

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
         VALUES ($1, 'paginacion@fundacionfenix.org', 'Paginación')`,
        [adminId],
      );
      campanas = new CampanasAdminService(
        base.getRepository(Campana),
        base,
        base.getRepository(FotoCampana),
        storage,
      );
      animales = new AnimalesAdminService(
        base.getRepository(Animal),
        base,
        storage,
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

    describe('listado de campañas', () => {
      beforeAll(async () => {
        await base.query(`DELETE FROM public.campanas`);
        // 12 campañas en 2026 (una por mes), 3 en 2025 y 1 sin fecha.
        for (let mes = 1; mes <= 12; mes += 1) {
          await crearCampana(
            `2026-${String(mes).padStart(2, '0')}-10`,
            'publicada',
            1,
            2,
          );
        }
        await crearCampana('2025-03-05', 'cerrada', 10, 0);
        await crearCampana('2025-03-20', 'cerrada', 5, 0);
        await crearCampana('2025-07-01', 'cerrada', 1, 1);
        await crearCampana(null, 'borrador');
      });

      it('pagina de 10 en 10 ordenando por fecha descendente y sin fecha al final', async () => {
        const primera = await campanas.listar({});
        const segunda = await campanas.listar({ pagina: 2 });

        expect(primera).toMatchObject({
          total: 16,
          pagina: 1,
          limite: 10,
          totalPaginas: 2,
        });
        expect(primera.items).toHaveLength(10);
        expect(primera.items[0].fecha).toBe('2026-12-10');
        expect(segunda.items).toHaveLength(6);
        expect(segunda.items.at(-1)?.fecha).toBeNull();
        const ids = new Set(
          [...primera.items, ...segunda.items].map((item) => item.id),
        );
        expect(ids.size).toBe(16);
      });

      it('suma las cifras de todo el filtro, no solo de la página', async () => {
        const pagina = await campanas.listar({ limite: 5 });

        expect(pagina.items).toHaveLength(5);
        expect(pagina.contadores).toEqual({
          perrosMachos: 12 + 16,
          perrosHembras: 0,
          gatosMachos: 0,
          gatosHembras: 24 + 1,
        });
        expect(pagina.totales.total).toBe(12 + 16 + 24 + 1);
      });

      it('filtra por año y por mes', async () => {
        const anio = await campanas.listar({ anio: 2025 });
        expect(anio.total).toBe(3);
        expect(anio.meses).toEqual([3, 7]);

        const mes = await campanas.listar({ anio: 2025, mes: 3 });
        expect(mes.total).toBe(2);
        expect(mes.contadores.perrosMachos).toBe(15);

        const soloMes = await campanas.listar({ mes: 3 });
        expect(soloMes.total).toBe(3);
      });

      it('lista los años con campañas y excluye las campañas sin fecha al filtrar', async () => {
        const pagina = await campanas.listar({ anio: 2026 });

        expect(pagina.anios).toEqual([2026, 2025]);
        expect(pagina.total).toBe(12);
        expect(pagina.items.every((item) => item.fecha !== null)).toBe(true);
      });

      it('una página fuera de rango devuelve la lista vacía con el total real', async () => {
        const pagina = await campanas.listar({ pagina: 9 });

        expect(pagina.items).toEqual([]);
        expect(pagina.total).toBe(16);
      });
    });

    describe('eliminar campaña', () => {
      it('la marca como eliminada, la oculta del panel y del sitio, borra sus fotos y audita', async () => {
        const id = await crearCampana('2024-05-01', 'publicada');
        await base.query(
          `INSERT INTO public.fotos_campana
             (campana_id, ruta, content_type, tamano, orden)
           VALUES ($1, 'campanas/x.webp', 'image/webp', 10, 1),
                  ($1, 'campanas/y.webp', 'image/webp', 10, 2)`,
          [id],
        );
        eliminados.length = 0;

        await campanas.eliminar(id, adminId);

        // El registro se conserva con la marca de borrado y quién lo eliminó.
        const [fila] = await base.query(
          `SELECT eliminado_en, eliminado_por FROM public.campanas WHERE id = $1`,
          [id],
        );
        expect(fila.eliminado_en).not.toBeNull();
        expect(fila.eliminado_por).toBe(adminId);
        const [{ n: fotosRestantes }] = await base.query(
          `SELECT count(*)::int AS n FROM public.fotos_campana WHERE campana_id = $1`,
          [id],
        );
        expect(fotosRestantes).toBe(0);

        // Ya no existe para el panel, ni para las vistas del sitio público.
        await expect(campanas.obtener(id)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        await expect(campanas.eliminar(id, adminId)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        const listado = await campanas.listar({ anio: 2024, limite: 50 });
        expect(listado.items.map((item) => item.id)).not.toContain(id);
        const [{ n: enVista }] = await base.query(
          `SELECT count(*)::int AS n FROM public.v_campanas_resumen WHERE id = $1`,
          [id],
        );
        expect(enVista).toBe(0);
        expect(eliminados.sort()).toEqual([
          'campanas/x.webp',
          'campanas/y.webp',
        ]);
        const auditoria = await base.query(
          `SELECT accion FROM public.auditoria
            WHERE tabla = 'campanas' AND registro_id = $1`,
          [id],
        );
        expect(auditoria.map((fila: { accion: string }) => fila.accion)).toContain(
          'DELETE',
        );
      });

      it('rechaza una campaña cerrada, la histórica y una inexistente', async () => {
        const cerrada = await crearCampana('2024-06-01', 'cerrada', 3);
        await expect(campanas.eliminar(cerrada, adminId)).rejects.toBeInstanceOf(
          ConflictException,
        );

        const historica = await crearCampana('2020-01-01', 'cerrada', 3);
        await base.query(
          `UPDATE public.campanas SET es_historico = true WHERE id = $1`,
          [historica],
        );
        await expect(
          campanas.eliminar(historica, adminId),
        ).rejects.toBeInstanceOf(ConflictException);

        await expect(
          campanas.eliminar(randomUUID(), adminId),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe('listado de animales', () => {
      it('pagina y filtra por adoptado', async () => {
        for (let indice = 1; indice <= 12; indice += 1) {
          await animales.registrar(
            {
              nombre: `Animal ${indice}`,
              especie: 'perro',
              sexo: 'macho',
              edad: 1,
              edadUnidad: 'anios',
              fechaIngreso: '2025-03-12',
              adoptado: indice <= 3,
              ...(indice <= 3
                ? {
                    nombreAdoptante: 'Carla',
                    direccionAdoptante: 'Calle 1',
                    fechaAdopcion: '2025-04-01',
                  }
                : {}),
            },
            adminId,
          );
        }

        const primera = await animales.listar({});
        const segunda = await animales.listar({ pagina: 2 });
        const adoptados = await animales.listar({ adoptado: true });

        expect(primera).toMatchObject({ total: 12, totalPaginas: 2, limite: 10 });
        expect(primera.items).toHaveLength(10);
        expect(segunda.items).toHaveLength(2);
        expect(
          new Set([...primera.items, ...segunda.items].map((a) => a.id)).size,
        ).toBe(12);
        expect(adoptados.total).toBe(3);
        expect(adoptados.items.every((a) => a.adoptado)).toBe(true);
      });
    });
  },
);
