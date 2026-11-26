import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearJpg } from '../../../test/utils/imagenes.js';
import { StorageService } from '../storage/storage.service.js';
import { Historia } from './entities/historia.entity.js';
import { FotosHistoriaService } from './fotos-historia.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const HISTORIA_ID = '22222222-2222-2222-2222-222222222222';
const RUTA_ANTERIOR = `historias/${HISTORIA_ID}/anterior.jpg`;
const JPG = crearJpg(800, 600);
const ARCHIVO = { buffer: JPG, mimetype: 'image/jpeg', size: JPG.length };

describe('FotosHistoriaService', () => {
  let repositorio: {
    existsBy: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let storage: {
    subir: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
    obtenerUrlPublica: ReturnType<typeof vi.fn>;
  };
  let servicio: FotosHistoriaService;

  const rutaSubida = () => storage.subir.mock.calls[0][0] as string;

  beforeEach(() => {
    repositorio = {
      existsBy: vi.fn().mockResolvedValue(true),
      findOne: vi.fn().mockResolvedValue({
        id: HISTORIA_ID,
        fotoRuta: RUTA_ANTERIOR,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      }),
      save: vi.fn(async (fila) => fila),
    };
    storage = {
      subir: vi.fn().mockResolvedValue(undefined),
      eliminar: vi.fn().mockResolvedValue(undefined),
      obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
    };
    const dataSource = {
      transaction: vi.fn(
        async (
          _nivel: string,
          operacion: (manager: unknown) => Promise<unknown>,
        ) => operacion({ getRepository: () => repositorio }),
      ),
    };
    servicio = new FotosHistoriaService(
      repositorio as unknown as Repository<Historia>,
      dataSource as unknown as DataSource,
      storage as unknown as StorageService,
    );
  });

  it('sube al bucket público y borra la foto anterior', async () => {
    const resultado = await servicio.subir(HISTORIA_ID, ARCHIVO, ADMIN_ID);

    expect(rutaSubida()).toMatch(
      new RegExp(`^historias/${HISTORIA_ID}/.+\\.jpg$`),
    );
    expect(storage.subir).toHaveBeenCalledWith(rutaSubida(), JPG, 'image/jpeg');
    expect(storage.eliminar).toHaveBeenCalledExactlyOnceWith(RUTA_ANTERIOR);
    expect(resultado.foto).toEqual({
      url: `https://cdn.test/${rutaSubida()}`,
      ancho: 800,
      alto: 600,
    });
  });

  it('quita el archivo nuevo y conserva el anterior si no se guarda', async () => {
    repositorio.save.mockRejectedValue(new Error('PostgreSQL caído'));

    await expect(
      servicio.subir(HISTORIA_ID, ARCHIVO, ADMIN_ID),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(storage.eliminar).toHaveBeenCalledExactlyOnceWith(rutaSubida());
  });

  it('quita el archivo nuevo si la historia se eliminó mientras subía', async () => {
    repositorio.findOne.mockResolvedValue(null);

    await expect(
      servicio.subir(HISTORIA_ID, ARCHIVO, ADMIN_ID),
    ).rejects.toThrow(NotFoundException);
    expect(storage.eliminar).toHaveBeenCalledExactlyOnceWith(rutaSubida());
  });

  it('no sube nada si la historia no existe', async () => {
    repositorio.existsBy.mockResolvedValue(false);

    await expect(
      servicio.subir(HISTORIA_ID, ARCHIVO, ADMIN_ID),
    ).rejects.toThrow(NotFoundException);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('responde 503 y no guarda nada si Storage falla', async () => {
    storage.subir.mockRejectedValue(new Error('Storage caído'));

    await expect(
      servicio.subir(HISTORIA_ID, ARCHIVO, ADMIN_ID),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(repositorio.save).not.toHaveBeenCalled();
  });
});
