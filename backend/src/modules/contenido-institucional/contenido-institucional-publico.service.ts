import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContenidoInstitucionalPublicoDto } from './dto/contenido-institucional-publico.dto.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

@Injectable()
export class ContenidoInstitucionalPublicoService {
  constructor(
    @InjectRepository(ContenidoInstitucional)
    private readonly repositorio: Repository<ContenidoInstitucional>,
  ) {}

  async listarVisibles(): Promise<ContenidoInstitucionalPublicoDto[]> {
    try {
      const contenidos = await this.repositorio.find({
        select: {
          clave: true,
          tituloEs: true,
          tituloEn: true,
          textoEs: true,
          textoEn: true,
          imagenRuta: true,
          orden: true,
        },
        where: { visible: true },
        order: { orden: 'ASC', clave: 'ASC' },
      });

      return contenidos.map((contenido) => ({
        clave: contenido.clave,
        titulo: { es: contenido.tituloEs, en: contenido.tituloEn },
        descripcion: { es: contenido.textoEs, en: contenido.textoEn },
        imagenUrl: contenido.imagenRuta,
        orden: contenido.orden,
      }));
    } catch {
      throw new ServiceUnavailableException(
        'El contenido institucional no está disponible temporalmente',
      );
    }
  }
}
