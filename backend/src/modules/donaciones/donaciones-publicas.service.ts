import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatoDonacionPublicoDto } from './dto/dato-donacion-publico.dto.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

@Injectable()
export class DonacionesPublicasService {
  constructor(
    @InjectRepository(DatoDonacion)
    private readonly repositorio: Repository<DatoDonacion>,
  ) {}

  async obtenerActiva(): Promise<DatoDonacionPublicoDto | null> {
    let configuraciones: DatoDonacion[];
    try {
      configuraciones = await this.repositorio.find({
        select: {
          titular: true,
          banco: true,
          telefono: true,
          referencia: true,
          numeroCuenta: true,
          avisoEs: true,
          avisoEn: true,
        },
        where: { activo: true },
        take: 2,
      });
    } catch {
      throw new ServiceUnavailableException(
        'Los datos de donación no están disponibles temporalmente',
      );
    }

    if (configuraciones.length > 1) {
      throw new ServiceUnavailableException(
        'La configuración de donaciones activas es inconsistente',
      );
    }

    const configuracion = configuraciones[0];
    if (!configuracion) {
      return null;
    }

    return {
      titular: configuracion.titular,
      banco: configuracion.banco,
      telefono: configuracion.telefono,
      referencia: configuracion.referencia,
      numeroCuenta: configuracion.numeroCuenta,
      aviso: { es: configuracion.avisoEs, en: configuracion.avisoEn },
      qrUrl: null,
    };
  }
}
