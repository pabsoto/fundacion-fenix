import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { StorageService } from '../storage/storage.service.js';
import { AnimalesAdminService } from './animales-admin.service.js';
import { RegistrarAnimalDto } from './dto/registrar-animal.dto.js';
import { Animal } from './entities/animal.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const ANIMAL_ID = '22222222-2222-2222-2222-222222222222';

function crearAnimal(cambios: Partial<Animal> = {}): Animal {
  return Object.assign(new Animal(), {
    id: ANIMAL_ID,
    nombre: 'Max',
    especie: 'perro',
    sexo: 'macho',
    edad: 3,
    edadUnidad: 'anios',
    fechaIngreso: '2025-03-12',
    adoptado: false,
    nombreAdoptante: null,
    direccionAdoptante: null,
    fechaAdopcion: null,
    fotoAnimalRuta: null,
    fotoAnimalContentType: null,
    fotoAnimalTamano: null,
    fotoEntregaRuta: null,
    fotoEntregaContentType: null,
    fotoEntregaTamano: null,
    creadoPorId: ADMIN_ID,
    actualizadoPorId: ADMIN_ID,
    eliminadoPorId: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    eliminadoEn: null,
    ...cambios,
  });
}

const sinAdopcion: RegistrarAnimalDto = {
  nombre: 'Max el grande',
  especie: 'perro',
  sexo: 'macho',
  edad: 4,
  edadUnidad: 'anios',
  fechaIngreso: '2025-03-12',
  adoptado: false,
};

const adoptado: RegistrarAnimalDto = {
  ...sinAdopcion,
  adoptado: true,
  nombreAdoptante: 'Carla Mamani',
  direccionAdoptante: 'Calle 5, Villa Adela',
  fechaAdopcion: '2026-01-15',
};

describe('AnimalesAdminService', () => {
  const findOneTransaccion = vi.fn();
  const guardar = vi.fn(async (animal: Animal) => animal);
  const crearAuditoria = vi.fn((datos: Partial<Auditoria>) => datos);
  const guardarAuditoria = vi.fn(async (datos: Partial<Auditoria>) => datos);
  const eliminarArchivo = vi.fn(async () => undefined);

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === Animal
        ? { findOne: findOneTransaccion, save: guardar }
        : { create: crearAuditoria, save: guardarAuditoria },
    ),
  } as unknown as EntityManager;

  const servicio = new AnimalesAdminService(
    {} as unknown as Repository<Animal>,
    {
      transaction: async (
        _aislamiento: string,
        operacion: (entityManager: EntityManager) => Promise<unknown>,
      ) => operacion(manager),
    } as unknown as DataSource,
    { eliminar: eliminarArchivo } as unknown as StorageService,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    guardar.mockImplementation(async (animal: Animal) => animal);
    eliminarArchivo.mockImplementation(async () => undefined);
  });

  describe('actualizar', () => {
    it('reemplaza los datos, conserva las fotos y audita el cambio', async () => {
      findOneTransaccion.mockResolvedValue(
        crearAnimal({
          fotoAnimalRuta: 'animales/a.jpg',
          fotoAnimalContentType: 'image/jpeg',
          fotoAnimalTamano: 10,
        }),
      );

      const resultado = await servicio.actualizar(
        ANIMAL_ID,
        sinAdopcion,
        ADMIN_ID,
      );

      expect(resultado).toMatchObject({
        id: ANIMAL_ID,
        nombre: 'Max el grande',
        edad: 4,
        adoptado: false,
        tieneFotoAnimal: true,
      });
      expect(guardar.mock.calls[0][0]).toMatchObject({
        actualizadoPorId: ADMIN_ID,
        fotoAnimalRuta: 'animales/a.jpg',
      });
      const auditoria = crearAuditoria.mock.calls[0][0];
      expect(auditoria).toMatchObject({
        tabla: 'animales',
        accion: 'UPDATE',
        registroId: ANIMAL_ID,
      });
      expect(auditoria.camposModificados).toEqual(
        expect.arrayContaining(['nombre', 'edad']),
      );
      expect(auditoria.datosDespues).not.toHaveProperty('tieneFotoAnimal');
      expect(eliminarArchivo).not.toHaveBeenCalled();
    });

    it('registra una adopción con los datos del adoptante', async () => {
      findOneTransaccion.mockResolvedValue(crearAnimal());

      const resultado = await servicio.actualizar(ANIMAL_ID, adoptado, ADMIN_ID);

      expect(resultado).toMatchObject({
        adoptado: true,
        nombreAdoptante: 'Carla Mamani',
        direccionAdoptante: 'Calle 5, Villa Adela',
        fechaAdopcion: '2026-01-15',
      });
    });

    it('si deja de estar adoptado, borra los datos de adopción y la foto de la entrega', async () => {
      findOneTransaccion.mockResolvedValue(
        crearAnimal({
          adoptado: true,
          nombreAdoptante: 'Carla Mamani',
          direccionAdoptante: 'Calle 5',
          fechaAdopcion: '2026-01-15',
          fotoEntregaRuta: 'entregas/e.jpg',
          fotoEntregaContentType: 'image/jpeg',
          fotoEntregaTamano: 10,
        }),
      );

      const resultado = await servicio.actualizar(
        ANIMAL_ID,
        sinAdopcion,
        ADMIN_ID,
      );

      expect(resultado).toMatchObject({
        adoptado: false,
        nombreAdoptante: null,
        direccionAdoptante: null,
        fechaAdopcion: null,
        tieneFotoEntrega: false,
      });
      expect(guardar.mock.calls[0][0]).toMatchObject({
        fotoEntregaRuta: null,
        fotoEntregaContentType: null,
        fotoEntregaTamano: null,
      });
      expect(eliminarArchivo).toHaveBeenCalledWith('entregas/e.jpg', true);
    });

    it('responde 404 si el animal no existe o está eliminado', async () => {
      findOneTransaccion.mockResolvedValue(null);

      await expect(
        servicio.actualizar(ANIMAL_ID, sinAdopcion, ADMIN_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(guardar).not.toHaveBeenCalled();
    });

    it('rechaza datos de adopción en un animal no adoptado (400)', async () => {
      await expect(
        servicio.actualizar(
          ANIMAL_ID,
          { ...sinAdopcion, nombreAdoptante: 'Alguien' },
          ADMIN_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(findOneTransaccion).not.toHaveBeenCalled();
    });

    it('rechaza una adopción anterior al ingreso (400)', async () => {
      await expect(
        servicio.actualizar(
          ANIMAL_ID,
          { ...adoptado, fechaAdopcion: '2024-01-01' },
          ADMIN_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('responde 503 y no toca Storage si la base falla', async () => {
      findOneTransaccion.mockResolvedValue(crearAnimal({ adoptado: true, fotoEntregaRuta: 'entregas/e.jpg' }));
      guardar.mockRejectedValue(new Error('db'));

      await expect(
        servicio.actualizar(ANIMAL_ID, sinAdopcion, ADMIN_ID),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(eliminarArchivo).not.toHaveBeenCalled();
    });

    it('si Storage falla al limpiar la foto de la entrega, igual guarda el cambio', async () => {
      findOneTransaccion.mockResolvedValue(
        crearAnimal({
          adoptado: true,
          nombreAdoptante: 'X',
          direccionAdoptante: 'Y',
          fechaAdopcion: '2026-01-15',
          fotoEntregaRuta: 'entregas/e.jpg',
          fotoEntregaContentType: 'image/jpeg',
          fotoEntregaTamano: 10,
        }),
      );
      eliminarArchivo.mockRejectedValue(new Error('storage'));

      await expect(
        servicio.actualizar(ANIMAL_ID, sinAdopcion, ADMIN_ID),
      ).resolves.toMatchObject({ adoptado: false });
    });
  });

  describe('eliminar', () => {
    it('hace un borrado lógico y lo audita', async () => {
      findOneTransaccion.mockResolvedValue(crearAnimal());

      await servicio.eliminar(ANIMAL_ID, ADMIN_ID);

      const guardado = guardar.mock.calls[0][0];
      expect(guardado.eliminadoEn).toBeInstanceOf(Date);
      expect(guardado).toMatchObject({
        eliminadoPorId: ADMIN_ID,
        actualizadoPorId: ADMIN_ID,
      });
      expect(crearAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          tabla: 'animales',
          accion: 'DELETE',
          registroId: ANIMAL_ID,
          datosDespues: null,
          datosAntes: expect.objectContaining({ nombre: 'Max' }),
        }),
      );
    });

    it('conserva las fotos en Storage', async () => {
      findOneTransaccion.mockResolvedValue(
        crearAnimal({ fotoAnimalRuta: 'animales/a.jpg' }),
      );

      await servicio.eliminar(ANIMAL_ID, ADMIN_ID);

      expect(eliminarArchivo).not.toHaveBeenCalled();
    });

    it('responde 404 si no existe o ya está eliminado', async () => {
      findOneTransaccion.mockResolvedValue(null);

      await expect(servicio.eliminar(ANIMAL_ID, ADMIN_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(guardar).not.toHaveBeenCalled();
    });

    it('responde 503 si falla la auditoría y no deja el borrado a medias', async () => {
      findOneTransaccion.mockResolvedValue(crearAnimal());
      guardarAuditoria.mockRejectedValueOnce(new Error('auditoría caída'));

      await expect(servicio.eliminar(ANIMAL_ID, ADMIN_ID)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
