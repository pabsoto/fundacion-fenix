import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service.js';
import { FotoCampanaDto } from './dto/foto-campana.dto.js';
import { Campana } from './entities/campana.entity.js';
import { FotoCampana } from './entities/foto-campana.entity.js';

export const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;

export interface ArchivoFotoCargado {
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export const FORMATOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type TipoFoto = keyof typeof FORMATOS;

function detectarTipo(buffer: Buffer): TipoFoto | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function validarArchivoFoto(
  archivo: ArchivoFotoCargado | undefined,
): TipoFoto {
  if (!archivo?.buffer || archivo.size === 0) {
    throw new BadRequestException('Debe adjuntar una fotografía');
  }
  if (archivo.size > TAMANO_MAXIMO_FOTO) {
    throw new PayloadTooLargeException(
      'La fotografía no puede superar los 5 MB',
    );
  }

  const tipo = detectarTipo(archivo.buffer);
  if (!tipo || archivo.mimetype.toLowerCase() !== tipo) {
    throw new UnsupportedMediaTypeException(
      'La fotografía debe ser un JPG, PNG o WebP válido',
    );
  }
  return tipo;
}

@Injectable()
export class FotosCampanaService {
  private readonly logger = new Logger(FotosCampanaService.name);

  constructor(
    @InjectRepository(Campana)
    private readonly campanas: Repository<Campana>,
    @InjectRepository(FotoCampana)
    private readonly fotos: Repository<FotoCampana>,
    private readonly storage: StorageService,
  ) {}

  async subir(
    campanaId: string,
    archivo: ArchivoFotoCargado | undefined,
    administradorId: string,
  ): Promise<FotoCampanaDto> {
    const tipo = this.validar(archivo);
    const { buffer, size } = archivo!;

    await this.exigirCampanaEditable(campanaId);

    const ruta = `campanas/${campanaId}/${randomUUID()}.${FORMATOS[tipo]}`;

    try {
      await this.storage.subir(ruta, buffer, tipo);
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía',
      );
    }

    try {
      const { maximo } = (await this.fotos
        .createQueryBuilder('foto')
        .select('COALESCE(MAX(foto.orden), 0)', 'maximo')
        .where('foto.campanaId = :campanaId', { campanaId })
        .getRawOne<{ maximo: number | string }>())!;

      const foto = await this.fotos.save(
        this.fotos.create({
          campanaId,
          ruta,
          contentType: tipo,
          tamano: size,
          orden: Number(maximo) + 1,
          creadoPorId: administradorId,
        }),
      );

      return {
        id: foto.id,
        campanaId,
        orden: foto.orden,
        url: this.storage.obtenerUrlPublica(ruta),
      };
    } catch {
      await this.storage.eliminar(ruta).catch((error: unknown) => {
        this.logger.error(
          `Limpieza pendiente de Supabase Storage para ${ruta}`,
          error instanceof Error ? error.message : 'Error de Storage',
        );
      });
      throw new ServiceUnavailableException(
        'No fue posible guardar la fotografía',
      );
    }
  }

  /** Quita una fotografía de la campaña y la borra de Storage. */
  async quitar(campanaId: string, fotoId: string): Promise<void> {
    await this.exigirCampanaEditable(campanaId);

    let foto: FotoCampana | null;
    try {
      foto = await this.fotos.findOne({ where: { id: fotoId, campanaId } });
    } catch {
      throw new ServiceUnavailableException(
        'Las fotografías no están disponibles temporalmente',
      );
    }
    if (!foto) throw new NotFoundException('La fotografía no existe');

    try {
      await this.fotos.delete({ id: foto.id });
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible quitar la fotografía',
      );
    }

    await this.storage.eliminar(foto.ruta).catch((error: unknown) => {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage para ${foto.ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    });
  }

  /**
   * Fija el orden de la galería. `ids` debe traer todas las fotos de la
   * campaña, sin repetir ni agregar otras; la primera pasa a ser la principal.
   */
  async reordenar(
    campanaId: string,
    ids: string[],
  ): Promise<FotoCampanaDto[]> {
    await this.exigirCampanaEditable(campanaId);

    let actuales: FotoCampana[];
    try {
      actuales = await this.fotos.find({
        where: { campanaId },
        order: { orden: 'ASC' },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Las fotografías no están disponibles temporalmente',
      );
    }

    const conocidas = new Set(actuales.map((foto) => foto.id));
    const completo =
      ids.length === actuales.length &&
      new Set(ids).size === ids.length &&
      ids.every((id) => conocidas.has(id));
    if (!completo) {
      throw new BadRequestException(
        'La lista debe incluir exactamente las fotografías de la campaña, sin repetir',
      );
    }

    const porId = new Map(actuales.map((foto) => [foto.id, foto]));
    const reordenadas = ids.map((id, indice) =>
      Object.assign(porId.get(id)!, { orden: indice + 1 }),
    );

    try {
      await this.fotos.save(reordenadas);
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible reordenar las fotografías',
      );
    }

    return reordenadas.map((foto) => ({
      id: foto.id,
      campanaId,
      orden: foto.orden,
      url: this.storage.obtenerUrlPublica(foto.ruta),
    }));
  }

  private async exigirCampanaEditable(campanaId: string): Promise<void> {
    let campana: Campana | null;
    try {
      campana = await this.campanas.findOne({
        where: { id: campanaId, eliminadoEn: IsNull() },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Las campañas no están disponibles temporalmente',
      );
    }
    if (!campana) throw new NotFoundException('La campaña no existe');
    if (campana.estado === 'cerrada') {
      throw new ConflictException(
        'Las fotografías de una campaña cerrada no se modifican. Reábrela primero',
      );
    }
  }

  private validar(archivo: ArchivoFotoCargado | undefined): TipoFoto {
    return validarArchivoFoto(archivo);
  }
}
