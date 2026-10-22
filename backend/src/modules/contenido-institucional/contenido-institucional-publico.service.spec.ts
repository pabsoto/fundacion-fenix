import { ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { ContenidoInstitucionalPublicoService } from './contenido-institucional-publico.service.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

describe('ContenidoInstitucionalPublicoService', () => {
  const find = vi.fn();
  const servicio = new ContenidoInstitucionalPublicoService({
    find,
  } as unknown as Repository<ContenidoInstitucional>);

  beforeEach(() => vi.clearAllMocks());

  it('consulta solamente contenido visible en orden y expone el DTO público', async () => {
    find.mockResolvedValue([
      {
        clave: 'mision',
        tituloEs: 'Misión',
        tituloEn: 'Mission',
        textoEs: 'Texto ES',
        textoEn: 'Text EN',
        imagenRuta: 'https://cdn.example/mision.jpg',
        orden: 1,
        id: 'no-debe-exponerse',
        actualizadoPorId: 'no-debe-exponerse',
      },
    ]);

    await expect(servicio.listarVisibles()).resolves.toEqual([
      {
        clave: 'mision',
        titulo: { es: 'Misión', en: 'Mission' },
        descripcion: { es: 'Texto ES', en: 'Text EN' },
        imagenUrl: 'https://cdn.example/mision.jpg',
        orden: 1,
      },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visible: true },
        order: { orden: 'ASC', clave: 'ASC' },
      }),
    );
    expect(find.mock.calls[0][0].select).not.toHaveProperty('id');
    expect(find.mock.calls[0][0].select).not.toHaveProperty(
      'actualizadoPorId',
    );
  });

  it('devuelve una lista vacía cuando no hay contenido visible', async () => {
    find.mockResolvedValue([]);
    await expect(servicio.listarVisibles()).resolves.toEqual([]);
  });

  it('convierte fallos de PostgreSQL en una respuesta de servicio no disponible', async () => {
    find.mockRejectedValue(new Error('detalle interno de PostgreSQL'));
    await expect(servicio.listarVisibles()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
