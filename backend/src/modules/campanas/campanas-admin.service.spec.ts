import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { CampanasAdminService } from './campanas-admin.service.js';
import { GuardarCampanaDto } from './dto/guardar-campana.dto.js';
import { Campana } from './entities/campana.entity.js';

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

  const servicio = new CampanasAdminService(
    { find, findOne } as unknown as Repository<Campana>,
    { transaction } as unknown as DataSource,
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
});
