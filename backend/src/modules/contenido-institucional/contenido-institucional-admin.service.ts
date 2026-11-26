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
  ActualizarContenidoDto,
  ContenidoInstitucionalAdminDto,
} from './dto/contenido-institucional-admin.dto.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

@Injectable()
export class ContenidoInstitucionalAdminService {
  constructor(
    @InjectRepository(ContenidoInstitucional)
    private readonly repositorio: Repository<ContenidoInstitucional>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<ContenidoInstitucionalAdminDto[]> {
    try {
      const filas = await this.repositorio.find({
        order: { orden: 'ASC', clave: 'ASC' },
      });
      return filas.map((fila) => this.aDto(fila));
    } catch (error) {
      throw new ServiceUnavailableException(
        'El contenido del sitio no está disponible temporalmente',
        { cause: error },
      );
    }
  }

  async actualizar(
    clave: string,
    entrada: ActualizarContenidoDto,
    administradorId: string,
  ): Promise<ContenidoInstitucionalAdminDto> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const contenidos = manager.getRepository(ContenidoInstitucional);
        const auditorias = manager.getRepository(Auditoria);
        const fila = await contenidos.findOne({
          where: { clave },
          lock: { mode: 'pessimistic_write' },
        });
        if (!fila) {
          throw new NotFoundException('La sección de contenido no existe');
        }

        const datosAntes = this.aSnapshot(fila);
        fila.textoEs = entrada.textoEs;
        fila.textoEn = entrada.textoEn ?? null;
        fila.tituloEs = entrada.tituloEs ?? null;
        fila.tituloEn = entrada.tituloEn ?? null;
        fila.visible = entrada.visible;
        fila.actualizadoPorId = administradorId;
        fila.actualizadoEn = new Date();
        const guardada = await contenidos.save(fila);

        const datosDespues = this.aSnapshot(guardada);
        await auditorias.save(
          auditorias.create({
            administradorId,
            tabla: 'contenido_institucional',
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
        'No fue posible guardar el contenido del sitio',
        { cause: error },
      );
    }
  }

  private aDto(fila: ContenidoInstitucional): ContenidoInstitucionalAdminDto {
    return {
      clave: fila.clave,
      tituloEs: fila.tituloEs,
      tituloEn: fila.tituloEn,
      textoEs: fila.textoEs,
      textoEn: fila.textoEn,
      imagenRuta: fila.imagenRuta,
      orden: fila.orden,
      visible: fila.visible,
      actualizadoEn: fila.actualizadoEn,
    };
  }

  private aSnapshot(fila: ContenidoInstitucional): Record<string, unknown> {
    return {
      id: fila.id,
      clave: fila.clave,
      titulo_es: fila.tituloEs,
      titulo_en: fila.tituloEn,
      texto_es: fila.textoEs,
      texto_en: fila.textoEn,
      imagen_ruta: fila.imagenRuta,
      orden: fila.orden,
      visible: fila.visible,
      actualizado_por: fila.actualizadoPorId,
      actualizado_en: fila.actualizadoEn,
    };
  }
}
