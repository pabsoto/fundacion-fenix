import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { CanalesContactoAdminService } from './canales-contacto-admin.service.js';
import { ActualizarCanalDto } from './dto/canal-contacto-admin.dto.js';
import { CanalContacto } from './entities/canal-contacto.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const REGISTRO_ID = '22222222-2222-2222-2222-222222222222';

const entrada: ActualizarCanalDto = {
  url: 'https://wa.me/59171111111',
  textoEs: 'Hablemos',
  textoEn: "Let's talk",
  activo: false,
};

function crearCanal(cambios: Partial<CanalContacto> = {}): CanalContacto {
  return {
    id: REGISTRO_ID,
    tipo: 'whatsapp',
    url: 'https://wa.me/59170000000',
    textoEs: 'Escríbenos',
    textoEn: 'Message us',
    orden: 1,
    activo: true,
    actualizadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  };
}

describe('CanalesContactoAdminService', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const guardar = vi.fn(async (fila: CanalContacto) => fila);
  const crearAuditoria = vi.fn((datos: Partial<Auditoria>) => datos);
  const guardarAuditoria = vi.fn(async (dato: Partial<Auditoria>) => dato);

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === CanalContacto
        ? { findOne, save: guardar }
        : { create: crearAuditoria, save: guardarAuditoria },
    ),
  } as unknown as EntityManager;
  const transaction = vi.fn(
    async (operacion: (entityManager: EntityManager) => Promise<unknown>) =>
      operacion(manager),
  );
  const servicio = new CanalesContactoAdminService(
    { find } as unknown as Repository<CanalContacto>,
    { transaction } as unknown as DataSource,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(crearCanal());
    guardar.mockImplementation(async (fila: CanalContacto) => fila);
    guardarAuditoria.mockImplementation(
      async (dato: Partial<Auditoria>) => dato,
    );
  });

  it('lista los canales, incluidos los inactivos, sin datos de administradores', async () => {
    find.mockResolvedValue([crearCanal({ activo: false })]);

    const canales = await servicio.listar();

    expect(find).toHaveBeenCalledWith({ order: { orden: 'ASC', tipo: 'ASC' } });
    expect(canales[0]).toMatchObject({ tipo: 'whatsapp', activo: false });
    expect(canales[0]).not.toHaveProperty('actualizadoPorId');
    expect(canales[0]).not.toHaveProperty('id');
  });

  it('oculta el error de PostgreSQL al listar', async () => {
    find.mockRejectedValue(new Error('detalle secreto'));

    await expect(servicio.listar()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('actualiza el canal y registra la auditoría con los campos cambiados', async () => {
    const resultado = await servicio.actualizar('whatsapp', entrada, ADMIN_ID);

    expect(findOne).toHaveBeenCalledWith({
      where: { tipo: 'whatsapp' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(resultado).toMatchObject({
      tipo: 'whatsapp',
      url: 'https://wa.me/59171111111',
      activo: false,
    });
    expect(guardar.mock.calls[0][0]).toMatchObject({
      actualizadoPorId: ADMIN_ID,
    });

    const auditoria = crearAuditoria.mock.calls[0][0];
    expect(auditoria).toMatchObject({
      administradorId: ADMIN_ID,
      tabla: 'canales_contacto',
      registroId: REGISTRO_ID,
      accion: 'UPDATE',
    });
    expect(auditoria.camposModificados).toEqual(
      expect.arrayContaining([
        'url',
        'texto_es',
        'texto_en',
        'activo',
        'actualizado_por',
        'actualizado_en',
      ]),
    );
    expect(auditoria.camposModificados).not.toContain('tipo');
    expect(auditoria.camposModificados).not.toContain('orden');
    expect(auditoria.datosAntes).toMatchObject({
      url: 'https://wa.me/59170000000',
    });
    expect(auditoria.datosDespues).toMatchObject({
      url: 'https://wa.me/59171111111',
    });
    expect(guardarAuditoria).toHaveBeenCalledTimes(1);
  });

  it('solo audita los campos que cambian realmente', async () => {
    findOne.mockResolvedValue(crearCanal({ actualizadoPorId: ADMIN_ID }));

    await servicio.actualizar(
      'whatsapp',
      {
        url: 'https://wa.me/59170000000',
        textoEs: 'Escríbenos',
        textoEn: 'Message us',
        activo: true,
      },
      ADMIN_ID,
    );

    expect(crearAuditoria.mock.calls[0][0].camposModificados).toEqual([
      'actualizado_en',
    ]);
  });

  it('guarda null en los textos omitidos', async () => {
    await servicio.actualizar(
      'whatsapp',
      { url: 'https://wa.me/1', activo: true },
      ADMIN_ID,
    );

    expect(guardar.mock.calls[0][0]).toMatchObject({
      textoEs: null,
      textoEn: null,
    });
  });

  it('responde 404 sin guardar ni auditar si el canal no existe', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      servicio.actualizar('tiktok', entrada, ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(guardar).not.toHaveBeenCalled();
    expect(guardarAuditoria).not.toHaveBeenCalled();
  });

  it('oculta el detalle si falla la auditoría', async () => {
    guardarAuditoria.mockRejectedValue(new Error('detalle secreto'));

    const error = await servicio
      .actualizar('whatsapp', entrada, ADMIN_ID)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toContain('secreto');
  });
});
