import {
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { camposModificados } from '../../common/utils/diferencias-auditoria.js';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import {
  ActualizarCanalDto,
  CanalContactoAdminDto,
} from './dto/canal-contacto-admin.dto.js';
import {
  CanalContacto,
  type TipoCanalContacto,
} from './entities/canal-contacto.entity.js';

@Injectable()
export class CanalesContactoAdminService {
  constructor(
    @InjectRepository(CanalContacto)
    private readonly repositorio: Repository<CanalContacto>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<CanalContactoAdminDto[]> {
    try {
      const filas = await this.repositorio.find({
        order: { orden: 'ASC', tipo: 'ASC' },
      });
      return filas.map((fila) => this.aDto(fila));
    } catch {
      throw new ServiceUnavailableException(
        'Los canales de contacto no están disponibles temporalmente',
      );
    }
  }

  async actualizar(
    tipo: TipoCanalContacto,
    entrada: ActualizarCanalDto,
    administradorId: string,
  ): Promise<CanalContactoAdminDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const canales = manager.getRepository(CanalContacto);
        const auditorias = manager.getRepository(Auditoria);
        const fila = await canales.findOne({
          where: { tipo },
          lock: { mode: 'pessimistic_write' },
        });
        if (!fila) throw new NotFoundException('El canal no existe');

        const datosAntes = this.aSnapshot(fila);
        fila.url = entrada.url;
        fila.textoEs = entrada.textoEs ?? null;
        fila.textoEn = entrada.textoEn ?? null;
        fila.activo = entrada.activo;
        fila.actualizadoPorId = administradorId;
        fila.actualizadoEn = new Date();
        const guardada = await canales.save(fila);

        const datosDespues = this.aSnapshot(guardada);
        await auditorias.save(
          auditorias.create({
            administradorId,
            tabla: 'canales_contacto',
            registroId: guardada.id,
            accion: 'UPDATE',
            camposModificados: camposModificados(datosAntes, datosDespues),
            datosAntes,
            datosDespues,
          }),
        );
        return this.aDto(guardada);
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible guardar el canal de contacto',
      );
    }
  }

  private aDto(fila: CanalContacto): CanalContactoAdminDto {
    return {
      tipo: fila.tipo,
      url: fila.url,
      textoEs: fila.textoEs,
      textoEn: fila.textoEn,
      orden: fila.orden,
      activo: fila.activo,
      actualizadoEn: fila.actualizadoEn,
    };
  }

  private aSnapshot(fila: CanalContacto): Record<string, unknown> {
    return {
      id: fila.id,
      tipo: fila.tipo,
      url: fila.url,
      texto_es: fila.textoEs,
      texto_en: fila.textoEn,
      orden: fila.orden,
      activo: fila.activo,
      actualizado_por: fila.actualizadoPorId,
      actualizado_en: fila.actualizadoEn,
    };
  }
}
