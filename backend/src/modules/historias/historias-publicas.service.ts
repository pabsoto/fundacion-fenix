import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { StorageService } from '../storage/storage.service.js';
import { HistoriaPublicaDto } from './dto/historia-publica.dto.js';
import { Historia } from './entities/historia.entity.js';
import { aHistoriaPublicaDto } from './historia-publica.mapper.js';

/**
 * Listado público de historias destacadas.
 * La consulta ya deja fuera lo oculto y lo eliminado; el DTO no lleva datos internos.
 */
@Injectable()
export class HistoriasPublicasService {
  constructor(
    @InjectRepository(Historia)
    private readonly historias: Repository<Historia>,
    private readonly storage: StorageService,
  ) {}

  async listar(): Promise<HistoriaPublicaDto[]> {
    try {
      const historias = await this.historias.find({
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
      return historias.map((historia) =>
        aHistoriaPublicaDto(historia, this.storage),
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        'Las historias no están disponibles temporalmente',
        { cause: error },
      );
    }
  }
}
