import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Between,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { CampanasAdminService } from './campanas-admin.service.js';
import { GuardarCampanaDto } from './dto/guardar-campana.dto.js';
import { StorageService } from '../storage/storage.service.js';
import { Campana } from './entities/campana.entity.js';
import { FotoCampana } from './entities/foto-campana.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const OTRO_ADMIN = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAMPANA_ID = '22222222-2222-2222-2222-222222222222';

const entrada: GuardarCampanaDto = {
  tituloEs: 'Campaña Villa Adela',
  tituloEn: 'Villa Adela campaign',
  descripcionEs: 'Esterilización gratuita',
  descripcionEn: null,
  lugar: 'Villa Adela, El Alto',
  fecha: '2026-11-21',
  estado: 'publicada',
};

function crearCampana(cambios: Partial<Campana> = {}): Campana {
  return Object.assign(new Campana(), {
    id: CAMPANA_ID,
    tituloEs: 'Borrador anterior',
    tituloEn: null,
    descripcionEs: null,
    descripcionEn: null,
    lugar: null,
    fecha: null,
    estado: 'borrador',
    perrosMachos: 3,
    perrosHembras: 4,
    gatosMachos: 1,
    gatosHembras: 2,
    esHistorico: false,
    creadoPorId: OTRO_ADMIN,
    creadoPor: null,
    actualizadoPorId: OTRO_ADMIN,
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  });
}

describe('CampanasAdminService', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const findOneTransaccion = vi.fn();
  const crear = vi.fn((datos: Partial<Campana>) =>
    crearCampana({ ...datos, id: CAMPANA_ID }),
  );
  const guardar = vi.fn(async (campana: Campana) => campana);
  const crearAuditoria = vi.fn((datos: Partial<Auditoria>) => datos);
  const guardarAuditoria = vi.fn(async (datos: Partial<Auditoria>) => datos);

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === Campana
        ? { findOne: findOneTransaccion, create: crear, save: guardar }
        : { create: crearAuditoria, save: guardarAuditoria },
    ),
  } as unknown as EntityManager;
  const transaction = vi.fn(
    async (
      _aislamiento: string,
      operacion: (entityManager: EntityManager) => Promise<unknown>,
    ) => operacion(manager),
  );

  const findFotos = vi.fn(async () => [] as unknown[]);
  const obtenerUrlPublica = vi.fn((ruta: string) => `https://fotos/${ruta}`);

  const servicio = new CampanasAdminService(
    { find, findOne } as unknown as Repository<Campana>,
    { transaction } as unknown as DataSource,
    { find: findFotos } as unknown as Repository<FotoCampana>,
    { obtenerUrlPublica } as unknown as StorageService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea la campaña con el administrador como responsable y la audita', async () => {
    const resultado = await servicio.crear(entrada, ADMIN_ID);

    expect(resultado).toMatchObject({
      id: CAMPANA_ID,
      tituloEs: 'Campaña Villa Adela',
      lugar: 'Villa Adela, El Alto',
      fecha: '2026-11-21',
      estado: 'publicada',
    });
    expect(resultado).not.toHaveProperty('creadoPorId');
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({
        creadoPorId: ADMIN_ID,
        actualizadoPorId: ADMIN_ID,
      }),
    );
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        administradorId: ADMIN_ID,
        tabla: 'campanas',
        registroId: CAMPANA_ID,
        accion: 'INSERT',
        datosAntes: null,
      }),
    );
  });

  it('actualiza solo los campos editables y conserva cifras y autor original', async () => {
    findOneTransaccion.mockResolvedValue(crearCampana());

    await servicio.actualizar(CAMPANA_ID, entrada, ADMIN_ID);

    const guardada = guardar.mock.calls[0][0];
    expect(guardada).toMatchObject({
      tituloEs: 'Campaña Villa Adela',
      estado: 'publicada',
      perrosMachos: 3,
      gatosHembras: 2,
      creadoPorId: OTRO_ADMIN,
      actualizadoPorId: ADMIN_ID,
    });
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'UPDATE',
        camposModificados: expect.arrayContaining([
          'titulo_es',
          'lugar',
          'fecha',
          'estado',
          'actualizado_por',
        ]),
        datosAntes: expect.objectContaining({ estado: 'borrador' }),
        datosDespues: expect.objectContaining({ estado: 'publicada' }),
      }),
    );
    expect(crearAuditoria.mock.calls[0][0].camposModificados).not.toContain(
      'creado_por',
    );
  });

  it('actualiza los contadores cuando se envían y los audita', async () => {
    findOneTransaccion.mockResolvedValue(crearCampana());

    await servicio.actualizar(
      CAMPANA_ID,
      { ...entrada, perrosMachos: 12, perrosHembras: 0, gatosHembras: 15 },
      ADMIN_ID,
    );

    expect(guardar.mock.calls[0][0]).toMatchObject({
      perrosMachos: 12,
      perrosHembras: 0,
      gatosMachos: 1,
      gatosHembras: 15,
    });
    expect(crearAuditoria.mock.calls[0][0].camposModificados).toEqual(
      expect.arrayContaining([
        'perros_machos',
        'perros_hembras',
        'gatos_hembras',
      ]),
    );
    expect(crearAuditoria.mock.calls[0][0].camposModificados).not.toContain(
      'gatos_machos',
    );
  });

  it('responde 404 al actualizar una campaña inexistente', async () => {
    findOneTransaccion.mockResolvedValue(null);

    await expect(
      servicio.actualizar(CAMPANA_ID, entrada, ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('no permite editar una campaña cerrada', async () => {
    findOneTransaccion.mockResolvedValue(crearCampana({ estado: 'cerrada' }));

    await expect(
      servicio.actualizar(CAMPANA_ID, entrada, ADMIN_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('traduce una restricción CHECK de PostgreSQL en 400', async () => {
    guardar.mockRejectedValueOnce(
      new QueryFailedError(
        'insert',
        [],
        Object.assign(new Error('check'), { code: '23514' }),
      ),
    );

    await expect(servicio.crear(entrada, ADMIN_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('no deja la campaña sin auditoría: si falla la auditoría responde 503', async () => {
    guardarAuditoria.mockRejectedValueOnce(new Error('auditoría caída'));

    await expect(servicio.crear(entrada, ADMIN_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('calcula los totales agregados a partir de los cuatro contadores', async () => {
    findOne.mockResolvedValue(
      crearCampana({
        perrosMachos: 12,
        perrosHembras: 20,
        gatosMachos: 8,
        gatosHembras: 15,
      }),
    );

    const resultado = await servicio.obtener(CAMPANA_ID);

    expect(resultado).toMatchObject({
      perrosMachos: 12,
      perrosHembras: 20,
      gatosMachos: 8,
      gatosHembras: 15,
      totales: { perros: 32, gatos: 23, machos: 20, hembras: 35, total: 55 },
    });
  });

  it('devuelve totales en cero para una campaña sin contadores', async () => {
    findOne.mockResolvedValue(
      crearCampana({
        perrosMachos: 0,
        perrosHembras: 0,
        gatosMachos: 0,
        gatosHembras: 0,
      }),
    );

    const resultado = await servicio.obtener(CAMPANA_ID);

    expect(resultado.totales).toEqual({
      perros: 0,
      gatos: 0,
      machos: 0,
      hembras: 0,
      total: 0,
    });
  });

  it('suma las cifras de un mes y consulta el rango completo del mes', async () => {
    find.mockResolvedValue([
      crearCampana({
        perrosMachos: 1,
        perrosHembras: 2,
        gatosMachos: 3,
        gatosHembras: 4,
      }),
      crearCampana({
        perrosMachos: 10,
        perrosHembras: 0,
        gatosMachos: 0,
        gatosHembras: 5,
      }),
    ]);

    const resultado = await servicio.consultarCifras({ anio: 2026, mes: 2 });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fecha: Between('2026-02-01', '2026-02-28') },
      }),
    );
    expect(resultado.periodo).toEqual({ anio: 2026, mes: 2 });
    expect(resultado.totales).toEqual({
      perros: 13,
      gatos: 12,
      machos: 14,
      hembras: 11,
      total: 25,
    });
    expect(resultado.campanas).toHaveLength(2);
  });

  it('consulta el año completo y filtra por estado cuando se indica', async () => {
    find.mockResolvedValue([]);

    const resultado = await servicio.consultarCifras({
      anio: 2028,
      estado: 'cerrada',
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fecha: Between('2028-01-01', '2028-12-31'),
          estado: 'cerrada',
        },
      }),
    );
    expect(resultado.periodo).toEqual({ anio: 2028, mes: null });
    expect(resultado.totales.total).toBe(0);
    expect(resultado.campanas).toEqual([]);
  });

  it('usa 29 días en febrero de un año bisiesto', async () => {
    find.mockResolvedValue([]);
    await servicio.consultarCifras({ anio: 2028, mes: 2 });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fecha: Between('2028-02-01', '2028-02-29') },
      }),
    );
  });

  it('no expone detalles de PostgreSQL al consultar cifras', async () => {
    find.mockRejectedValue(new Error('conexión rechazada'));
    await expect(
      servicio.consultarCifras({ anio: 2026 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('los totales por especie y por sexo suman lo mismo en el límite máximo', async () => {
    findOne.mockResolvedValue(
      crearCampana({
        perrosMachos: 100000,
        perrosHembras: 100000,
        gatosMachos: 100000,
        gatosHembras: 100000,
      }),
    );
    const { totales } = await servicio.obtener(CAMPANA_ID);
    expect(totales.perros + totales.gatos).toBe(totales.total);
    expect(totales.machos + totales.hembras).toBe(totales.total);
    expect(totales.total).toBe(400000);
  });

  it('responde 404 al obtener una campaña inexistente', async () => {
    findOne.mockResolvedValue(null);

    await expect(servicio.obtener(CAMPANA_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no expone detalles de PostgreSQL al listar', async () => {
    find.mockRejectedValue(new Error('host secreto'));

    await expect(servicio.listar()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('incluye las fotos de cada campaña, en orden, con una sola consulta', async () => {
    const otraId = '33333333-3333-3333-3333-333333333333';
    find.mockResolvedValue([
      crearCampana(),
      crearCampana({ id: otraId, tituloEs: 'Sin fotos' }),
    ]);
    findFotos.mockResolvedValue([
      { campanaId: CAMPANA_ID, ruta: 'c/1.webp', orden: 1 },
      { campanaId: CAMPANA_ID, ruta: 'c/2.webp', orden: 2 },
    ]);

    const lista = await servicio.listar();

    expect(findFotos).toHaveBeenCalledTimes(1);
    expect(lista[0].fotos).toEqual([
      'https://fotos/c/1.webp',
      'https://fotos/c/2.webp',
    ]);
    expect(lista[1].fotos).toEqual([]);
  });

  it('devuelve las fotos de una campaña al obtenerla', async () => {
    findOne.mockResolvedValue(crearCampana());
    findFotos.mockResolvedValue([
      { campanaId: CAMPANA_ID, ruta: 'c/1.webp', orden: 1 },
    ]);

    const campana = await servicio.obtener(CAMPANA_ID);

    expect(campana.fotos).toEqual(['https://fotos/c/1.webp']);
  });

  it('responde la campaña actualizada aunque falle la consulta de fotos', async () => {
    findOneTransaccion.mockResolvedValue(crearCampana());
    findFotos.mockRejectedValue(new Error('storage caído'));

    const campana = await servicio.actualizar(CAMPANA_ID, entrada, ADMIN_ID);

    expect(campana.id).toBe(CAMPANA_ID);
    expect(campana.fotos).toEqual([]);
  });
});
