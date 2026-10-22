import { ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { CanalesContactoPublicosService } from './canales-contacto-publicos.service.js';
import { CanalContacto } from './entities/canal-contacto.entity.js';

describe('CanalesContactoPublicosService', () => {
  const find = vi.fn();
  const servicio = new CanalesContactoPublicosService({
    find,
  } as unknown as Repository<CanalContacto>);

  beforeEach(() => vi.clearAllMocks());

  it('consulta sólo canales activos en orden y expone el DTO público', async () => {
    find.mockResolvedValue([
      {
        tipo: 'instagram',
        url: 'https://instagram.com/fenix',
        textoEs: 'Síguenos',
        textoEn: 'Follow us',
        orden: 2,
        id: 'no-debe-exponerse',
        actualizadoPorId: 'no-debe-exponerse',
      },
    ]);

    await expect(servicio.listarActivos()).resolves.toEqual([
      {
        tipo: 'instagram',
        url: 'https://instagram.com/fenix',
        texto: { es: 'Síguenos', en: 'Follow us' },
        orden: 2,
      },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { activo: true },
        order: { orden: 'ASC', tipo: 'ASC' },
      }),
    );
    expect(find.mock.calls[0][0].select).not.toHaveProperty('id');
    expect(find.mock.calls[0][0].select).not.toHaveProperty(
      'actualizadoPorId',
    );
  });

  it('devuelve una lista vacía cuando no existen canales activos', async () => {
    find.mockResolvedValue([]);
    await expect(servicio.listarActivos()).resolves.toEqual([]);
  });

  it('convierte fallos de PostgreSQL en una respuesta de servicio no disponible', async () => {
    find.mockRejectedValue(new Error('detalle interno de PostgreSQL'));
    await expect(servicio.listarActivos()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
