import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CanalContactoPublicoDto } from './dto/canal-contacto-publico.dto.js';
import { CanalContacto } from './entities/canal-contacto.entity.js';

@Injectable()
export class CanalesContactoPublicosService {
  constructor(
    @InjectRepository(CanalContacto)
    private readonly repositorio: Repository<CanalContacto>,
  ) {}

  async listarActivos(): Promise<CanalContactoPublicoDto[]> {
    try {
      const canales = await this.repositorio.find({
        select: {
          tipo: true,
          url: true,
          textoEs: true,
          textoEn: true,
          orden: true,
        },
        where: { activo: true },
        order: { orden: 'ASC', tipo: 'ASC' },
      });

      return canales.map((canal) => ({
        tipo: canal.tipo,
        url: canal.url,
        texto: { es: canal.textoEs, en: canal.textoEn },
        orden: canal.orden,
      }));
    } catch {
      throw new ServiceUnavailableException(
        'Los canales de contacto no están disponibles temporalmente',
      );
    }
  }
}
