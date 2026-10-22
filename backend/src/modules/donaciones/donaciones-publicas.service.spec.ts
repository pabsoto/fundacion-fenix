import { ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';
import { StorageService } from '../storage/storage.service.js';

describe('DonacionesPublicasService', () => {
  const find = vi.fn();
  const obtenerUrlPublica = vi.fn(
    (ruta: string) =>
      `https://proyecto.supabase.co/storage/v1/object/public/fenix-donaciones/${ruta}`,
  );
  const servicio = new DonacionesPublicasService(
    {
      find,
    } as unknown as Repository<DatoDonacion>,
    {
      obtenerUrlPublica,
    } as unknown as StorageService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('devuelve exclusivamente los datos públicos de la configuración activa', async () => {
    find.mockResolvedValue([
      {
        titular: 'Fundación FÉNIX',
        banco: 'Banco',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: '123-456',
        avisoEs: 'Aviso',
        avisoEn: 'Notice',
        id: 'no-debe-exponerse',
        qrRuta: null,
        qrVenceEl: null,
        creadoPorId: 'no-debe-exponerse',
      },
    ]);

    await expect(servicio.obtenerActiva()).resolves.toEqual({
      titular: 'Fundación FÉNIX',
      banco: 'Banco',
      telefono: '70000000',
      referencia: 'Donación',
      numeroCuenta: '123-456',
      aviso: { es: 'Aviso', en: 'Notice' },
      qrUrl: null,
    });
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true }, take: 2 }),
    );
    expect(find.mock.calls[0][0].select).not.toHaveProperty('id');
    expect(find.mock.calls[0][0].select).not.toHaveProperty('creadoPorId');
  });

  it('publica la URL autorizada de un QR vigente sin exponer su ruta', async () => {
    find.mockResolvedValue([
      {
        titular: 'Fundación FÉNIX',
        banco: 'Banco',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: null,
        avisoEs: null,
        avisoEn: null,
        qrRuta: 'qr/id/archivo.png',
        qrVenceEl: '2099-12-31',
      },
    ]);
    const resultado = await servicio.obtenerActiva();
    expect(resultado?.qrUrl).toContain('/qr/id/archivo.png');
    expect(resultado).not.toHaveProperty('qrRuta');
  });

  it('oculta un QR vencido', async () => {
    find.mockResolvedValue([
      {
        titular: 'Fundación FÉNIX',
        banco: 'Banco',
        telefono: '70000000',
        referencia: 'Donación',
        numeroCuenta: null,
        avisoEs: null,
        avisoEn: null,
        qrRuta: 'qr/id/vencido.png',
        qrVenceEl: '2020-01-01',
      },
    ]);
    await expect(servicio.obtenerActiva()).resolves.toMatchObject({
      qrUrl: null,
    });
  });

  it('devuelve null cuando no hay una configuración activa', async () => {
    find.mockResolvedValue([]);
    await expect(servicio.obtenerActiva()).resolves.toBeNull();
  });

  it('rechaza una configuración inconsistente con más de un registro activo', async () => {
    find.mockResolvedValue([{}, {}]);
    await expect(servicio.obtenerActiva()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('convierte fallos de PostgreSQL en una respuesta de servicio no disponible', async () => {
    find.mockRejectedValue(new Error('detalle interno de PostgreSQL'));
    await expect(servicio.obtenerActiva()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
