import { ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

describe('DonacionesPublicasService', () => {
  const find = vi.fn();
  const servicio = new DonacionesPublicasService({
    find,
  } as unknown as Repository<DatoDonacion>);

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
        qrRuta: 'ruta/interna.png',
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
    expect(find.mock.calls[0][0].select).not.toHaveProperty('qrRuta');
    expect(find.mock.calls[0][0].select).not.toHaveProperty('creadoPorId');
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
