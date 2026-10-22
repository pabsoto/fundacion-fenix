import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { DonacionesAdminService } from './donaciones-admin.service.js';
import { GuardarDatoDonacionDto } from './dto/guardar-dato-donacion.dto.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const REGISTRO_ID = '22222222-2222-2222-2222-222222222222';

const entrada: GuardarDatoDonacionDto = {
  titular: 'Fundación FÉNIX',
  banco: 'Banco oficial',
  telefono: '70000000',
  referencia: 'Donación',
  numeroCuenta: '123-456',
  avisoEs: 'Aviso',
  avisoEn: 'Notice',
};

function crearDonacion(cambios: Partial<DatoDonacion> = {}): DatoDonacion {
  return {
    id: REGISTRO_ID,
    titular: 'Fundación FÉNIX',
    banco: 'Banco anterior',
    telefono: '70000000',
    referencia: 'Donación',
    numeroCuenta: '123-456',
    qrRuta: 'donaciones/qr-existente.png',
    qrVenceEl: '2027-01-31',
    avisoEs: 'Aviso anterior',
    avisoEn: 'Previous notice',
    activo: true,
    creadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    creadoPor: null,
    actualizadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  };
}

describe('DonacionesAdminService', () => {
  const findPublicoAdmin = vi.fn();
  const findTransaccion = vi.fn();
  const crearDonacionMock = vi.fn((datos: Partial<DatoDonacion>) =>
    crearDonacion({
      ...datos,
      qrRuta: null,
      qrVenceEl: null,
      creadoPor: null,
      actualizadoPor: null,
    }),
  );
  const guardarDonacion = vi.fn(async (dato: DatoDonacion) => dato);
  const crearAuditoria = vi.fn((datos: Partial<Auditoria>) => datos);
  const guardarAuditoria = vi.fn(async (dato: Partial<Auditoria>) => dato);

  const repositorioTransaccion = {
    find: findTransaccion,
    create: crearDonacionMock,
    save: guardarDonacion,
  };
  const repositorioAuditoria = {
    create: crearAuditoria,
    save: guardarAuditoria,
  };
  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === DatoDonacion ? repositorioTransaccion : repositorioAuditoria,
    ),
  } as unknown as EntityManager;
  const transaction = vi.fn(
    async (
      _aislamiento: string,
      operacion: (entityManager: EntityManager) => Promise<unknown>,
    ) => operacion(manager),
  );
  const servicio = new DonacionesAdminService(
    { find: findPublicoAdmin } as unknown as Repository<DatoDonacion>,
    { transaction } as unknown as DataSource,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    findPublicoAdmin.mockResolvedValue([]);
    findTransaccion.mockResolvedValue([]);
    guardarDonacion.mockImplementation(async (dato: DatoDonacion) => dato);
    guardarAuditoria.mockImplementation(
      async (dato: Partial<Auditoria>) => dato,
    );
  });

  it('consulta la configuración activa sin datos de administradores', async () => {
    findPublicoAdmin.mockResolvedValue([crearDonacion()]);

    await expect(servicio.obtenerActiva()).resolves.toEqual({
      donacion: {
        titular: 'Fundación FÉNIX',
        banco: 'Banco anterior',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: '123-456',
        avisoEs: 'Aviso anterior',
        avisoEn: 'Previous notice',
        activo: true,
      },
    });
    expect(findPublicoAdmin.mock.calls[0][0].select).not.toHaveProperty(
      'creadoPorId',
    );
  });

  it('devuelve una respuesta editable coherente cuando no existe configuración', async () => {
    await expect(servicio.obtenerActiva()).resolves.toEqual({ donacion: null });
  });

  it('crea la primera configuración y su auditoría en la misma transacción', async () => {
    const resultado = await servicio.guardar(entrada, ADMIN_ID);

    expect(transaction).toHaveBeenCalledWith(
      'SERIALIZABLE',
      expect.any(Function),
    );
    expect(crearDonacionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activo: true,
        creadoPorId: ADMIN_ID,
        actualizadoPorId: ADMIN_ID,
      }),
    );
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        administradorId: ADMIN_ID,
        tabla: 'datos_donacion',
        registroId: REGISTRO_ID,
        accion: 'INSERT',
        datosAntes: null,
      }),
    );
    expect(resultado.accion).toBe('INSERT');
  });

  it('actualiza la configuración existente y conserva ambos campos QR', async () => {
    const existente = crearDonacion();
    findTransaccion.mockResolvedValue([existente]);

    const resultado = await servicio.guardar(entrada, ADMIN_ID);

    expect(resultado.accion).toBe('UPDATE');
    expect(existente.qrRuta).toBe('donaciones/qr-existente.png');
    expect(existente.qrVenceEl).toBe('2027-01-31');
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'UPDATE',
        administradorId: ADMIN_ID,
        datosAntes: expect.objectContaining({
          qr_ruta: 'donaciones/qr-existente.png',
          qr_vence_el: '2027-01-31',
        }),
        datosDespues: expect.objectContaining({
          qr_ruta: 'donaciones/qr-existente.png',
          qr_vence_el: '2027-01-31',
        }),
      }),
    );
  });

  it('rechaza configuraciones activas múltiples sin actualizar ninguna', async () => {
    findTransaccion.mockResolvedValue([crearDonacion(), crearDonacion()]);

    await expect(servicio.guardar(entrada, ADMIN_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(guardarDonacion).not.toHaveBeenCalled();
    expect(guardarAuditoria).not.toHaveBeenCalled();
  });

  it('responde 503 cuando falla la auditoría', async () => {
    guardarAuditoria.mockRejectedValue(new Error('fallo de auditoría'));

    await expect(servicio.guardar(entrada, ADMIN_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('responde 503 cuando falla PostgreSQL al consultar', async () => {
    findPublicoAdmin.mockRejectedValue(new Error('conexión rechazada'));
    await expect(servicio.obtenerActiva()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
