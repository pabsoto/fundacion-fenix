import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service.js';
import { Animal } from './entities/animal.entity.js';
import { FotosAnimalService } from './fotos-animal.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const ANIMAL_ID = '22222222-2222-2222-2222-222222222222';
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const archivo = (buffer: Buffer, mimetype: string) => ({
  buffer,
  mimetype,
  size: buffer.length,
});

describe('FotosAnimalService', () => {
  let animales: {
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let storage: {
    subir: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
    crearUrlFirmada: ReturnType<typeof vi.fn>;
  };
  let servicio: FotosAnimalService;

  beforeEach(() => {
    animales = {
      findOne: vi.fn().mockResolvedValue({
        id: ANIMAL_ID,
        adoptado: true,
        fotoAnimalRuta: null,
        fotoEntregaRuta: null,
      }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    storage = {
      subir: vi.fn().mockResolvedValue(undefined),
      eliminar: vi.fn().mockResolvedValue(undefined),
      crearUrlFirmada: vi.fn(
        async (ruta: string) => `https://firmada.test/${ruta}`,
      ),
    };
    servicio = new FotosAnimalService(
      animales as unknown as Repository<Animal>,
      storage as unknown as StorageService,
    );
  });

  it('guarda la foto de entrega en el bucket privado y devuelve una URL firmada', async () => {
    const resultado = await servicio.subir(
      'entrega',
      ANIMAL_ID,
      archivo(JPG, 'image/jpeg'),
      ADMIN_ID,
    );

    const ruta = storage.subir.mock.calls[0][0] as string;
    expect(ruta).toMatch(new RegExp(`^entregas/${ANIMAL_ID}/.+\\.jpg$`));
    expect(storage.subir).toHaveBeenCalledWith(ruta, JPG, 'image/jpeg', true);
    expect(animales.update).toHaveBeenCalledWith(
      ANIMAL_ID,
      expect.objectContaining({
        fotoEntregaRuta: ruta,
        fotoEntregaContentType: 'image/jpeg',
        fotoEntregaTamano: JPG.length,
        actualizadoPorId: ADMIN_ID,
      }),
    );
    expect(resultado).toEqual({
      animalId: ANIMAL_ID,
      url: `https://firmada.test/${ruta}`,
      expiraEnSegundos: 300,
    });
  });

  it('guarda la foto del animal aunque no esté adoptado', async () => {
    animales.findOne.mockResolvedValue({ id: ANIMAL_ID, adoptado: false });

    await servicio.subir(
      'animal',
      ANIMAL_ID,
      archivo(JPG, 'image/jpeg'),
      ADMIN_ID,
    );

    const ruta = storage.subir.mock.calls[0][0] as string;
    expect(ruta).toMatch(new RegExp(`^animales/${ANIMAL_ID}/`));
    expect(animales.update).toHaveBeenCalledWith(
      ANIMAL_ID,
      expect.objectContaining({ fotoAnimalRuta: ruta }),
    );
  });

  it('rechaza la foto de entrega de un animal no adoptado', async () => {
    animales.findOne.mockResolvedValue({ id: ANIMAL_ID, adoptado: false });

    await expect(
      servicio.subir(
        'entrega',
        ANIMAL_ID,
        archivo(JPG, 'image/jpeg'),
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza un animal inexistente', async () => {
    animales.findOne.mockResolvedValue(null);

    await expect(
      servicio.subir('animal', ANIMAL_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza una solicitud sin archivo', async () => {
    await expect(
      servicio.subir('animal', ANIMAL_ID, undefined, ADMIN_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un archivo cuyo contenido no es una imagen', async () => {
    await expect(
      servicio.subir(
        'animal',
        ANIMAL_ID,
        archivo(Buffer.from('no es una imagen'), 'image/jpeg'),
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('borra el archivo subido si falla la base de datos', async () => {
    animales.update.mockRejectedValue(new Error('db caída'));

    await expect(
      servicio.subir('animal', ANIMAL_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.eliminar).toHaveBeenCalledWith(
      storage.subir.mock.calls[0][0],
      true,
    );
  });

  it('no toca la base de datos si falla la subida a Storage', async () => {
    storage.subir.mockRejectedValue(new Error('storage caído'));

    await expect(
      servicio.subir('animal', ANIMAL_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(animales.update).not.toHaveBeenCalled();
  });

  it('elimina la foto anterior al reemplazarla', async () => {
    animales.findOne.mockResolvedValue({
      id: ANIMAL_ID,
      adoptado: true,
      fotoEntregaRuta: 'entregas/anterior.jpg',
    });

    await servicio.subir(
      'entrega',
      ANIMAL_ID,
      archivo(JPG, 'image/jpeg'),
      ADMIN_ID,
    );

    expect(storage.eliminar).toHaveBeenCalledWith(
      'entregas/anterior.jpg',
      true,
    );
  });

  it('devuelve una URL firmada de la foto guardada', async () => {
    animales.findOne.mockResolvedValue({
      id: ANIMAL_ID,
      adoptado: false,
      fotoAnimalRuta: 'animales/a.jpg',
    });

    const resultado = await servicio.obtener('animal', ANIMAL_ID);

    expect(storage.crearUrlFirmada).toHaveBeenCalledWith('animales/a.jpg', 300);
    expect(resultado.url).toBe('https://firmada.test/animales/a.jpg');
  });

  it('responde 404 si el animal no tiene esa foto', async () => {
    await expect(servicio.obtener('entrega', ANIMAL_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('responde 503 si no puede firmar la URL', async () => {
    animales.findOne.mockResolvedValue({
      id: ANIMAL_ID,
      adoptado: true,
      fotoEntregaRuta: 'entregas/a.jpg',
    });
    storage.crearUrlFirmada.mockRejectedValue(new Error('sin firma'));

    await expect(servicio.obtener('entrega', ANIMAL_ID)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
