import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { StorageService } from '../storage/storage.service.js';
import {
  DonacionesQrService,
  TAMANO_MAXIMO_QR,
  type ArchivoQrCargado,
} from './donaciones-qr.service.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const REGISTRO_ID = '22222222-2222-2222-2222-222222222222';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]),
]);

function archivo(cambios: Partial<ArchivoQrCargado> = {}): ArchivoQrCargado {
  return {
    originalname: 'donacion.png',
    mimetype: 'image/png',
    size: PNG.length,
    buffer: PNG,
    ...cambios,
  };
}

function donacion(cambios: Partial<DatoDonacion> = {}): DatoDonacion {
  return Object.assign(new DatoDonacion(), {
    id: REGISTRO_ID,
    titular: 'Fundación FÉNIX',
    banco: 'Banco oficial',
    telefono: '70000000',
    referencia: 'Donación',
    numeroCuenta: '123-456',
    qrRuta: 'qr/anterior/qr.png',
    qrVenceEl: '2026-12-31',
    avisoEs: null,
    avisoEn: null,
    activo: true,
    creadoPorId: ADMIN_ID,
    actualizadoPorId: ADMIN_ID,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  });
}

describe('DonacionesQrService', () => {
  const buscar = vi.fn();
  const guardarDonacion = vi.fn(async (dato: DatoDonacion) => dato);
  const crearAuditoria = vi.fn((dato: Partial<Auditoria>) => dato);
  const guardarAuditoria = vi.fn(async (dato: Partial<Auditoria>) => dato);
  const subir = vi.fn().mockResolvedValue(undefined);
  const eliminar = vi.fn().mockResolvedValue(undefined);
  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === DatoDonacion
        ? { find: buscar, save: guardarDonacion }
        : { create: crearAuditoria, save: guardarAuditoria },
    ),
  } as unknown as EntityManager;
  const transaction = vi.fn(
    async (_nivel: string, operacion: (manager: EntityManager) => unknown) =>
      operacion(manager),
  );
  const servicio = new DonacionesQrService(
    { transaction } as unknown as DataSource,
    { subir, eliminar } as unknown as StorageService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    subir.mockResolvedValue(undefined);
    eliminar.mockResolvedValue(undefined);
    buscar.mockResolvedValue([donacion()]);
    guardarDonacion.mockImplementation(async (dato: DatoDonacion) => dato);
    guardarAuditoria.mockImplementation(
      async (dato: Partial<Auditoria>) => dato,
    );
  });

  it('sube con nombre único, actualiza y audita sin incluir el archivo', async () => {
    const resultado = await servicio.reemplazar(
      archivo(),
      '2027-12-31',
      ADMIN_ID,
    );

    expect(resultado).toEqual({
      qr: { disponible: true, venceEl: '2027-12-31' },
    });
    expect(subir).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(`^qr/${REGISTRO_ID}/[0-9a-f-]{36}\\.png$`),
      ),
      PNG,
      'image/png',
    );
    expect(buscar).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' }, take: 2 }),
    );
    expect(guardarDonacion).toHaveBeenCalledWith(
      expect.objectContaining({
        banco: 'Banco oficial',
        qrVenceEl: '2027-12-31',
        actualizadoPorId: ADMIN_ID,
      }),
    );
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'UPDATE',
        camposModificados: expect.arrayContaining(['qr_ruta', 'qr_vence_el']),
        datosAntes: expect.objectContaining({ qr_ruta: 'qr/anterior/qr.png' }),
      }),
    );
    expect(JSON.stringify(crearAuditoria.mock.calls[0][0])).not.toContain(
      PNG.toString('base64'),
    );
    expect(eliminar).toHaveBeenCalledWith('qr/anterior/qr.png');
  });

  it('rechaza contenido, extensión o MIME incoherentes', async () => {
    await expect(
      servicio.reemplazar(
        archivo({
          originalname: 'qr.svg',
          mimetype: 'image/svg+xml',
          buffer: Buffer.from('<svg/>'),
          size: 6,
        }),
        undefined,
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(subir).not.toHaveBeenCalled();
  });

  it('rechaza archivos mayores a 2 MB', async () => {
    await expect(
      servicio.reemplazar(
        archivo({ size: TAMANO_MAXIMO_QR + 1 }),
        undefined,
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('exige una configuración bancaria activa antes de subir', async () => {
    buscar.mockResolvedValue([]);
    await expect(
      servicio.reemplazar(archivo(), undefined, ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(subir).not.toHaveBeenCalled();
  });

  it('no modifica PostgreSQL cuando falla Storage', async () => {
    subir.mockRejectedValue(new Error('Storage no disponible'));
    await expect(
      servicio.reemplazar(archivo(), undefined, ADMIN_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(guardarDonacion).not.toHaveBeenCalled();
    expect(guardarAuditoria).not.toHaveBeenCalled();
  });

  it('intenta limpiar el objeto nuevo cuando falla PostgreSQL o la auditoría', async () => {
    guardarAuditoria.mockRejectedValue(new Error('auditoría no disponible'));
    await expect(
      servicio.reemplazar(archivo(), undefined, ADMIN_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    const rutaNueva = subir.mock.calls[0][0] as string;
    expect(eliminar).toHaveBeenCalledWith(rutaNueva);
    expect(eliminar).not.toHaveBeenCalledWith('qr/anterior/qr.png');
  });

  it('mantiene confirmada la referencia nueva si falla la limpieza anterior', async () => {
    eliminar.mockRejectedValue(new Error('fallo de limpieza'));
    await expect(
      servicio.reemplazar(archivo(), undefined, ADMIN_ID),
    ).resolves.toEqual({ qr: { disponible: true, venceEl: null } });
  });

  it('retira sólo el QR y registra una actualización auditada', async () => {
    await expect(servicio.retirar(ADMIN_ID)).resolves.toEqual({
      qr: { disponible: false, venceEl: null },
    });
    expect(guardarDonacion).toHaveBeenCalledWith(
      expect.objectContaining({ banco: 'Banco oficial', qrRuta: null }),
    );
    expect(crearAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'UPDATE' }),
    );
    expect(eliminar).toHaveBeenCalledWith('qr/anterior/qr.png');
  });
});
