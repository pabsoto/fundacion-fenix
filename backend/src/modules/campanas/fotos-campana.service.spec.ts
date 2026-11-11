import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service.js';
import { Campana } from './entities/campana.entity.js';
import { FotoCampana } from './entities/foto-campana.entity.js';
import {
  FotosCampanaService,
  TAMANO_MAXIMO_FOTO,
} from './fotos-campana.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const CAMPANA_ID = '22222222-2222-2222-2222-222222222222';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x04, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 '),
]);

const archivo = (buffer: Buffer, mimetype: string) => ({
  buffer,
  mimetype,
  size: buffer.length,
});

describe('FotosCampanaService', () => {
  let campanas: { findOne: ReturnType<typeof vi.fn> };
  let fotos: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let storage: {
    subir: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
    obtenerUrlPublica: ReturnType<typeof vi.fn>;
  };
  let servicio: FotosCampanaService;

  beforeEach(() => {
    campanas = { findOne: vi.fn().mockResolvedValue({ id: CAMPANA_ID }) };
    fotos = {
      create: vi.fn((datos: Partial<FotoCampana>) => datos),
      save: vi.fn(async (foto: Partial<FotoCampana>) => ({
        id: 'foto-id',
        ...foto,
      })),
      findOne: vi.fn(),
      find: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      createQueryBuilder: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ maximo: '2' }),
      })),
    };
    storage = {
      subir: vi.fn().mockResolvedValue(undefined),
      eliminar: vi.fn().mockResolvedValue(undefined),
      obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
    };
    servicio = new FotosCampanaService(
      campanas as unknown as Repository<Campana>,
      fotos as unknown as Repository<FotoCampana>,
      storage as unknown as StorageService,
    );
  });

  it('no sube fotos a una campaña cerrada (409) ni toca Storage', async () => {
    campanas.findOne.mockResolvedValue({ id: CAMPANA_ID, estado: 'cerrada' });

    await expect(
      servicio.subir(CAMPANA_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.subir).not.toHaveBeenCalled();
    expect(fotos.save).not.toHaveBeenCalled();
  });

  it.each([
    ['image/jpeg', JPG, 'jpg'],
    ['image/png', PNG, 'png'],
    ['image/webp', WEBP, 'webp'],
  ])('guarda una foto %s válida', async (mimetype, buffer, extension) => {
    const resultado = await servicio.subir(
      CAMPANA_ID,
      archivo(buffer, mimetype),
      ADMIN_ID,
    );

    const [ruta, contenido, tipo] = storage.subir.mock.calls[0];
    expect(ruta).toMatch(
      new RegExp(`^campanas/${CAMPANA_ID}/[0-9a-f-]{36}\\.${extension}$`),
    );
    expect(contenido).toBe(buffer);
    expect(tipo).toBe(mimetype);
    expect(fotos.save).toHaveBeenCalledWith(
      expect.objectContaining({
        campanaId: CAMPANA_ID,
        ruta,
        orden: 3,
        creadoPorId: ADMIN_ID,
      }),
    );
    expect(resultado).toEqual({
      id: 'foto-id',
      campanaId: CAMPANA_ID,
      orden: 3,
      url: `https://cdn.test/${ruta}`,
    });
  });

  it('rechaza cuando falta el archivo o está vacío (400)', async () => {
    await expect(
      servicio.subir(CAMPANA_ID, undefined, ADMIN_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.subir(
        CAMPANA_ID,
        archivo(Buffer.alloc(0), 'image/png'),
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una foto mayor al límite (413)', async () => {
    await expect(
      servicio.subir(
        CAMPANA_ID,
        { buffer: JPG, mimetype: 'image/jpeg', size: TAMANO_MAXIMO_FOTO + 1 },
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it.each([
    ['contenido que no es imagen', Buffer.from('<svg/>'), 'image/png'],
    ['tipo MIME distinto al contenido', JPG, 'image/png'],
    ['tipo no admitido', Buffer.from('GIF89a......'), 'image/gif'],
  ])('rechaza %s (415)', async (_caso, buffer, mimetype) => {
    await expect(
      servicio.subir(CAMPANA_ID, archivo(buffer, mimetype), ADMIN_ID),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('rechaza una campaña inexistente (404)', async () => {
    campanas.findOne.mockResolvedValue(null);

    await expect(
      servicio.subir(CAMPANA_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.subir).not.toHaveBeenCalled();
  });

  it('responde 503 si Storage falla y no guarda el registro', async () => {
    storage.subir.mockRejectedValue(new Error('storage'));

    await expect(
      servicio.subir(CAMPANA_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fotos.save).not.toHaveBeenCalled();
  });

  it('elimina el archivo subido si falla PostgreSQL', async () => {
    fotos.save.mockRejectedValue(new Error('db'));

    await expect(
      servicio.subir(CAMPANA_ID, archivo(JPG, 'image/jpeg'), ADMIN_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.eliminar).toHaveBeenCalledWith(
      storage.subir.mock.calls[0][0],
    );
  });

  describe('quitar y reordenar', () => {
    const FOTO_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const FOTO_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const FOTO_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const galeria = () => [
      { id: FOTO_A, campanaId: CAMPANA_ID, ruta: 'campanas/a.webp', orden: 1 },
      { id: FOTO_B, campanaId: CAMPANA_ID, ruta: 'campanas/b.webp', orden: 2 },
      { id: FOTO_C, campanaId: CAMPANA_ID, ruta: 'campanas/c.webp', orden: 3 },
    ];

    it('quita la foto de la base y de Storage', async () => {
      fotos.findOne.mockResolvedValue(galeria()[1]);

      await servicio.quitar(CAMPANA_ID, FOTO_B);

      expect(fotos.findOne).toHaveBeenCalledWith({
        where: { id: FOTO_B, campanaId: CAMPANA_ID },
      });
      expect(fotos.delete).toHaveBeenCalledWith({ id: FOTO_B });
      expect(storage.eliminar).toHaveBeenCalledWith('campanas/b.webp');
    });

    it('responde 404 si la foto no es de esa campaña', async () => {
      fotos.findOne.mockResolvedValue(null);

      await expect(servicio.quitar(CAMPANA_ID, FOTO_B)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(fotos.delete).not.toHaveBeenCalled();
      expect(storage.eliminar).not.toHaveBeenCalled();
    });

    it('responde 404 si la campaña no existe', async () => {
      campanas.findOne.mockResolvedValue(null);

      await expect(servicio.quitar(CAMPANA_ID, FOTO_B)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('no modifica las fotos de una campaña cerrada (409)', async () => {
      campanas.findOne.mockResolvedValue({ id: CAMPANA_ID, estado: 'cerrada' });

      await expect(servicio.quitar(CAMPANA_ID, FOTO_B)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(
        servicio.reordenar(CAMPANA_ID, [FOTO_A, FOTO_B, FOTO_C]),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(fotos.delete).not.toHaveBeenCalled();
      expect(fotos.save).not.toHaveBeenCalled();
    });

    it('si Storage falla al limpiar, la foto ya quedó quitada', async () => {
      fotos.findOne.mockResolvedValue(galeria()[0]);
      storage.eliminar.mockRejectedValue(new Error('storage'));

      await expect(servicio.quitar(CAMPANA_ID, FOTO_A)).resolves.toBeUndefined();
      expect(fotos.delete).toHaveBeenCalled();
    });

    it('responde 503 si no puede borrar de la base y no toca Storage', async () => {
      fotos.findOne.mockResolvedValue(galeria()[0]);
      fotos.delete.mockRejectedValue(new Error('db'));

      await expect(servicio.quitar(CAMPANA_ID, FOTO_A)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(storage.eliminar).not.toHaveBeenCalled();
    });

    it('reordena la galería y la primera pasa a ser la principal', async () => {
      fotos.find.mockResolvedValue(galeria());
      fotos.save.mockImplementation(async (lista: unknown) => lista);

      const resultado = await servicio.reordenar(CAMPANA_ID, [
        FOTO_C,
        FOTO_A,
        FOTO_B,
      ]);

      expect(resultado.map((foto) => [foto.id, foto.orden])).toEqual([
        [FOTO_C, 1],
        [FOTO_A, 2],
        [FOTO_B, 3],
      ]);
      expect(resultado[0].url).toBe('https://cdn.test/campanas/c.webp');
    });

    it.each([
      ['faltan fotos', [FOTO_A, FOTO_B]],
      ['sobra una foto ajena', [FOTO_A, FOTO_B, FOTO_C, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd']],
      ['una foto no es de la campaña', [FOTO_A, FOTO_B, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd']],
      ['hay repetidas', [FOTO_A, FOTO_A, FOTO_B]],
    ])('rechaza el orden si %s (400)', async (_caso, ids) => {
      fotos.find.mockResolvedValue(galeria());

      await expect(servicio.reordenar(CAMPANA_ID, ids)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fotos.save).not.toHaveBeenCalled();
    });

    it('responde 503 si no puede guardar el nuevo orden', async () => {
      fotos.find.mockResolvedValue(galeria());
      fotos.save.mockRejectedValue(new Error('db'));

      await expect(
        servicio.reordenar(CAMPANA_ID, [FOTO_C, FOTO_B, FOTO_A]),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
