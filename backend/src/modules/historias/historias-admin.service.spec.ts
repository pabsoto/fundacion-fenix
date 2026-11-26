import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage/storage.service.js';
import { Historia } from './entities/historia.entity.js';
import { HistoriasAdminService } from './historias-admin.service.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const OTRO_ADMIN_ID = '99999999-9999-9999-9999-999999999999';

function crearHistoria(cambios: Partial<Historia> = {}): Historia {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    animalNombre: 'Luna',
    tituloEs: 'Título',
    tituloEn: 'Title',
    textoEs: 'Texto',
    textoEn: 'Text',
    autorNombre: null,
    fechaHistoria: '2026-10-01',
    fotoRuta: 'historias/a/foto.jpg',
    fotoContentType: 'image/jpeg',
    fotoTamano: 100,
    fotoAncho: 800,
    fotoAlto: 600,
    orden: 1,
    visible: true,
    actualizadoPorId: OTRO_ADMIN_ID,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    eliminadoEn: null,
    ...cambios,
  } as Historia;
}

describe('HistoriasAdminService', () => {
  let repositorio: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    maximum: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let storage: {
    eliminar: ReturnType<typeof vi.fn>;
    obtenerUrlPublica: ReturnType<typeof vi.fn>;
  };
  let getRepository: ReturnType<typeof vi.fn>;
  let servicio: HistoriasAdminService;

  beforeEach(() => {
    repositorio = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(crearHistoria()),
      maximum: vi.fn().mockResolvedValue(null),
      create: vi.fn((datos) => ({ id: 'nueva', ...datos })),
      save: vi.fn(async (fila) => fila),
    };
    storage = {
      eliminar: vi.fn().mockResolvedValue(undefined),
      obtenerUrlPublica: vi.fn((ruta: string) => `https://cdn.test/${ruta}`),
    };
    getRepository = vi.fn(() => repositorio);
    const dataSource = {
      transaction: vi.fn(
        async (
          _nivel: string,
          operacion: (manager: unknown) => Promise<unknown>,
        ) => operacion({ getRepository }),
      ),
    };
    servicio = new HistoriasAdminService(
      repositorio as unknown as Repository<Historia>,
      dataSource as unknown as DataSource,
      storage as unknown as StorageService,
    );
  });

  it('asigna el primer orden cuando no hay historias', async () => {
    const creada = await servicio.crear(
      {
        animalNombre: 'Luna',
        tituloEs: 'Título',
        tituloEn: 'Title',
        textoEs: 'Texto',
        textoEn: 'Text',
        fechaHistoria: '2026-10-01',
      },
      ADMIN_ID,
    );

    expect(creada).toMatchObject({
      orden: 1,
      visible: false,
      foto: null,
      autorNombre: null,
    });
  });

  it('solo escribe las historias que cambian de lugar al reordenar', async () => {
    const primera = crearHistoria({ id: 'a', orden: 1 });
    const segunda = crearHistoria({ id: 'b', orden: 2 });
    const tercera = crearHistoria({ id: 'c', orden: 3 });
    repositorio.find.mockResolvedValue([primera, segunda, tercera]);

    const resultado = await servicio.reordenar(['a', 'c', 'b'], ADMIN_ID);

    expect(resultado.map((historia) => historia.id)).toEqual(['a', 'c', 'b']);
    expect(repositorio.save).toHaveBeenCalledWith([tercera, segunda]);
    expect(primera.actualizadoPorId).toBe(OTRO_ADMIN_ID);
    expect(segunda.actualizadoPorId).toBe(ADMIN_ID);
    expect(tercera.actualizadoPorId).toBe(ADMIN_ID);
  });

  it('no escribe en auditoría: lo hace el disparador de la tabla', async () => {
    await servicio.eliminar(crearHistoria().id, ADMIN_ID);

    expect(getRepository.mock.calls).toEqual([[Historia]]);
  });

  it('vacía la foto y la borra de Storage al eliminar', async () => {
    await servicio.eliminar(crearHistoria().id, ADMIN_ID);

    expect(repositorio.save).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: false,
        fotoRuta: null,
        fotoContentType: null,
        fotoTamano: null,
        fotoAncho: null,
        fotoAlto: null,
        eliminadoPorId: ADMIN_ID,
        actualizadoPorId: ADMIN_ID,
        eliminadoEn: expect.any(Date),
      }),
    );
    expect(storage.eliminar).toHaveBeenCalledWith('historias/a/foto.jpg');
  });

  it('confirma el borrado aunque falle la limpieza de Storage', async () => {
    storage.eliminar.mockRejectedValue(new Error('Storage caído'));

    await expect(
      servicio.eliminar(crearHistoria().id, ADMIN_ID),
    ).resolves.toBeUndefined();
  });

  it('no borra la foto si el borrado no se guarda', async () => {
    repositorio.save.mockRejectedValue(new Error('PostgreSQL caído'));

    await expect(
      servicio.eliminar(crearHistoria().id, ADMIN_ID),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(storage.eliminar).not.toHaveBeenCalled();
  });

  it('responde 503 si no se pueden listar las historias', async () => {
    repositorio.find.mockRejectedValue(new Error('PostgreSQL caído'));

    await expect(servicio.listar()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
