import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { DonacionesAdminService } from './donaciones-admin.service.js';
import { GuardarDatoDonacionDto } from './dto/guardar-dato-donacion.dto.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';
import { StorageService } from '../storage/storage.service.js';

const URL_QR = (ruta: string) =>
  `https://proyecto.supabase.co/storage/v1/object/public/fenix-donaciones/${ruta}`;

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
  const obtenerUrlPublica = vi.fn(URL_QR);
  const servicio = new DonacionesAdminService(
    { find: findPublicoAdmin } as unknown as Repository<DatoDonacion>,
    { transaction } as unknown as DataSource,
    { obtenerUrlPublica } as unknown as StorageService,
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

    const resultado = await servicio.obtenerActiva();
    expect(resultado).toEqual({
      donacion: {
        titular: 'Fundación FÉNIX',
        banco: 'Banco anterior',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: '123-456',
        avisoEs: 'Aviso anterior',
        avisoEn: 'Previous notice',
        activo: true,
        qrUrl: URL_QR('donaciones/qr-existente.png'),
        actualizadoEn: '2026-01-01T00:00:00.000Z',
        qr: { disponible: true, venceEl: '2027-01-31' },
      },
    });
    expect(resultado.donacion).not.toHaveProperty('qrRuta');
    expect(resultado.donacion).not.toHaveProperty('creadoPorId');
    expect(resultado.donacion).not.toHaveProperty('actualizadoPorId');
    const seleccion = findPublicoAdmin.mock.calls[0][0].select;
    expect(seleccion).not.toHaveProperty('creadoPorId');
    expect(seleccion).not.toHaveProperty('actualizadoPorId');
  });

  it('entrega qrUrl de un QR vencido y null si no hay archivo', async () => {
    findPublicoAdmin.mockResolvedValue([
      crearDonacion({
        qrRuta: 'qr/id/vencido.png',
        qrVenceEl: '2020-01-01',
      }),
    ]);

    await expect(servicio.obtenerActiva()).resolves.toMatchObject({
      donacion: { qrUrl: URL_QR('qr/id/vencido.png') },
    });

    findPublicoAdmin.mockResolvedValue([
      crearDonacion({ qrRuta: null, qrVenceEl: '2020-01-01' }),
    ]);
    await expect(servicio.obtenerActiva()).resolves.toMatchObject({
      donacion: { qrUrl: null },
    });
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
    expect(existente.activo).toBe(true);
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

  it('guarda activo y qrVenceEl sin reemplazar la imagen', async () => {
    const existente = crearDonacion();
    findTransaccion.mockResolvedValue([existente]);

    await servicio.guardar(
      {
        titular: entrada.titular,
        banco: entrada.banco,
        telefono: entrada.telefono,
        referencia: entrada.referencia,
        numeroCuenta: entrada.numeroCuenta,
        avisoEs: entrada.avisoEs,
        avisoEn: entrada.avisoEn,
        activo: false,
        qrVenceEl: '2026-12-01',
      },
      ADMIN_ID,
    );

    expect(existente.activo).toBe(false);
    expect(existente.qrVenceEl).toBe('2026-12-01');
    expect(existente.qrRuta).toBe('donaciones/qr-existente.png');
  });

  it('borra qrVenceEl con null y lo conserva si se omite', async () => {
    const existente = crearDonacion();
    findTransaccion.mockResolvedValue([existente]);

    await servicio.guardar(
      {
        titular: entrada.titular,
        banco: entrada.banco,
        telefono: entrada.telefono,
        referencia: entrada.referencia,
        numeroCuenta: entrada.numeroCuenta,
        avisoEs: entrada.avisoEs,
        avisoEn: entrada.avisoEn,
        qrVenceEl: null,
      },
      ADMIN_ID,
    );
    expect(existente.qrVenceEl).toBeNull();
    expect(existente.qrRuta).toBe('donaciones/qr-existente.png');

    existente.qrVenceEl = '2027-01-31';
    await servicio.guardar(entrada, ADMIN_ID);
    expect(existente.qrVenceEl).toBe('2027-01-31');
    expect(existente.activo).toBe(true);
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

  it('desactiva la configuracion activa y conserva una auditoria reversible', async () => {
    const existente = crearDonacion({ qrRuta: null, qrVenceEl: null });
    findTransaccion.mockResolvedValue([existente]);

    await expect(servicio.desactivar(ADMIN_ID)).resolves.toEqual({
      desactivada: true,
    });
    expect(existente.activo).toBe(false);
    expect(existente.actualizadoPorId).toBe(ADMIN_ID);
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'UPDATE',
        administradorId: ADMIN_ID,
        camposModificados: ['activo', 'actualizado_por', 'actualizado_en'],
        datosAntes: expect.objectContaining({ activo: true }),
        datosDespues: expect.objectContaining({ activo: false }),
      }),
    );
  });

  it('no crea auditoria cuando no existe configuracion activa', async () => {
    await expect(servicio.desactivar(ADMIN_ID)).resolves.toEqual({
      desactivada: false,
    });
    expect(guardarDonacion).not.toHaveBeenCalled();
    expect(guardarAuditoria).not.toHaveBeenCalled();
  });

  it('responde 503 cuando falla PostgreSQL al consultar', async () => {
    findPublicoAdmin.mockRejectedValue(new Error('conexión rechazada'));
    await expect(servicio.obtenerActiva()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
