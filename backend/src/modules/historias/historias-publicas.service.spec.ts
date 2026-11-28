import { ServiceUnavailableException } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { vi } from 'vitest';
import { StorageService } from '../storage/storage.service.js';
import { Historia } from './entities/historia.entity.js';
import { HistoriasPublicasService } from './historias-publicas.service.js';

describe('HistoriasPublicasService', () => {
  const find = vi.fn();
  const obtenerUrlPublica = vi.fn(
    (ruta: string) => `https://cdn.test/${ruta}`,
  );
  const servicio = new HistoriasPublicasService(
    { find } as unknown as Repository<Historia>,
    { obtenerUrlPublica } as unknown as StorageService,
  );

  beforeEach(() => vi.clearAllMocks());

  it('pide solo historias visibles y no eliminadas, en orden, y arma la URL pública', async () => {
    find.mockResolvedValue([
      {
        id: 'historia-1',
        animalNombre: 'Luna',
        tituloEs: 'Luna encontró un hogar',
        tituloEn: 'Luna found a home',
        textoEs: 'Texto',
        textoEn: 'Text',
        autorNombre: null,
        fechaHistoria: '2026-10-01',
        fotoRuta: 'historias/luna/foto.jpg',
        fotoAncho: 900,
        fotoAlto: 1600,
        orden: 1,
        visible: true,
        creadoPorId: 'no-debe-exponerse',
        fotoContentType: 'image/jpeg',
      },
    ]);

    await expect(servicio.listar()).resolves.toEqual([
      {
        id: 'historia-1',
        animalNombre: 'Luna',
        tituloEs: 'Luna encontró un hogar',
        tituloEn: 'Luna found a home',
        textoEs: 'Texto',
        textoEn: 'Text',
        autorNombre: null,
        fechaHistoria: '2026-10-01',
        foto: {
          url: 'https://cdn.test/historias/luna/foto.jpg',
          ancho: 900,
          alto: 1600,
        },
      },
    ]);

    expect(find).toHaveBeenCalledWith({
      select: {
        id: true,
        animalNombre: true,
        tituloEs: true,
        tituloEn: true,
        textoEs: true,
        textoEn: true,
        autorNombre: true,
        fechaHistoria: true,
        fotoRuta: true,
        fotoAncho: true,
        fotoAlto: true,
      },
      where: { visible: true, eliminadoEn: IsNull() },
      order: { orden: 'ASC' },
    });
    expect(obtenerUrlPublica).toHaveBeenCalledWith('historias/luna/foto.jpg');
  });

  it('devuelve foto nula cuando la historia no tiene archivo', async () => {
    find.mockResolvedValue([
      {
        id: 'historia-2',
        animalNombre: 'Max',
        tituloEs: 'Max',
        tituloEn: 'Max',
        textoEs: 'Texto',
        textoEn: 'Text',
        autorNombre: 'Familia Quispe',
        fechaHistoria: new Date('2026-03-08T00:00:00.000Z'),
        fotoRuta: null,
        fotoAncho: null,
        fotoAlto: null,
      },
    ]);

    const [historia] = await servicio.listar();
    expect(historia?.foto).toBeNull();
    expect(historia?.autorNombre).toBe('Familia Quispe');
    expect(historia?.fechaHistoria).toBe('2026-03-08');
    expect(obtenerUrlPublica).not.toHaveBeenCalled();
  });

  it('devuelve una lista vacía cuando no hay historias visibles', async () => {
    find.mockResolvedValue([]);
    await expect(servicio.listar()).resolves.toEqual([]);
  });

  it('convierte fallos de PostgreSQL en una respuesta de servicio no disponible', async () => {
    find.mockRejectedValue(new Error('detalle interno de PostgreSQL'));
    await expect(servicio.listar()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
