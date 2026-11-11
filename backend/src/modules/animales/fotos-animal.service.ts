import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  FORMATOS,
  validarArchivoFoto,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';
import { StorageService } from '../storage/storage.service.js';
import { FotoAnimalDto } from './dto/foto-animal.dto.js';
import { Animal } from './entities/animal.entity.js';

export const SEGUNDOS_URL_FIRMADA = 300;

export type TipoFotoAnimal = 'animal' | 'entrega';

const COLUMNAS = {
  animal: {
    carpeta: 'animales',
    ruta: 'fotoAnimalRuta',
    contentType: 'fotoAnimalContentType',
    tamano: 'fotoAnimalTamano',
  },
  entrega: {
    carpeta: 'entregas',
    ruta: 'fotoEntregaRuta',
    contentType: 'fotoEntregaContentType',
    tamano: 'fotoEntregaTamano',
  },
} as const;

@Injectable()
export class FotosAnimalService {
  private readonly logger = new Logger(FotosAnimalService.name);

  constructor(
    @InjectRepository(Animal)
    private readonly animales: Repository<Animal>,
    private readonly storage: StorageService,
  ) {}

  async subir(
    tipoFoto: TipoFotoAnimal,
    animalId: string,
    archivo: ArchivoFotoCargado | undefined,
    administradorId: string,
  ): Promise<FotoAnimalDto> {
    const tipo = validarArchivoFoto(archivo);
    const { buffer, size } = archivo!;
    const columnas = COLUMNAS[tipoFoto];
    const animal = await this.buscar(tipoFoto, animalId);
    const rutaAnterior = animal[columnas.ruta];
    const ruta = `${columnas.carpeta}/${animalId}/${randomUUID()}.${FORMATOS[tipo]}`;

    try {
      await this.storage.subir(ruta, buffer, tipo, true);
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía',
      );
    }

    try {
      await this.animales.update(animalId, {
        [columnas.ruta]: ruta,
        [columnas.contentType]: tipo,
        [columnas.tamano]: size,
        actualizadoPorId: administradorId,
        actualizadoEn: new Date(),
      });
    } catch {
      await this.limpiar(ruta);
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía',
      );
    }

    if (rutaAnterior) await this.limpiar(rutaAnterior);
    return this.firmar(animalId, ruta);
  }

  async obtener(
    tipoFoto: TipoFotoAnimal,
    animalId: string,
  ): Promise<FotoAnimalDto> {
    const animal = await this.buscar(tipoFoto, animalId);
    const ruta = animal[COLUMNAS[tipoFoto].ruta];
    if (!ruta) throw new NotFoundException('El animal no tiene esa fotografía');
    return this.firmar(animalId, ruta);
  }

  /** Quita la foto del animal o de su entrega y la borra de Storage. */
  async quitar(
    tipoFoto: TipoFotoAnimal,
    animalId: string,
    administradorId: string,
  ): Promise<void> {
    const columnas = COLUMNAS[tipoFoto];
    const animal = await this.buscar(tipoFoto, animalId);
    const ruta = animal[columnas.ruta];
    if (!ruta) throw new NotFoundException('El animal no tiene esa fotografía');

    try {
      await this.animales.update(animalId, {
        [columnas.ruta]: null,
        [columnas.contentType]: null,
        [columnas.tamano]: null,
        actualizadoPorId: administradorId,
        actualizadoEn: new Date(),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible quitar la fotografía',
      );
    }

    await this.limpiar(ruta);
  }

  private async buscar(
    tipoFoto: TipoFotoAnimal,
    animalId: string,
  ): Promise<Animal> {
    let animal: Animal | null;
    try {
      animal = await this.animales.findOne({
        where: { id: animalId, eliminadoEn: IsNull() },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Los animales no están disponibles temporalmente',
      );
    }
    if (!animal) throw new NotFoundException('El animal no existe');
    if (tipoFoto === 'entrega' && !animal.adoptado) {
      throw new ConflictException(
        'Solo un animal adoptado puede tener foto de entrega',
      );
    }
    return animal;
  }

  private async firmar(animalId: string, ruta: string): Promise<FotoAnimalDto> {
    try {
      return {
        animalId,
        url: await this.storage.crearUrlFirmada(ruta, SEGUNDOS_URL_FIRMADA),
        expiraEnSegundos: SEGUNDOS_URL_FIRMADA,
      };
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible generar el acceso a la fotografía',
      );
    }
  }

  private async limpiar(ruta: string): Promise<void> {
    await this.storage.eliminar(ruta, true).catch((error: unknown) => {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage para ${ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    });
  }
}
