import { randomUUID } from 'node:crypto';
import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  FORMATOS,
  validarArchivoFoto,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';
import { StorageService } from '../storage/storage.service.js';
import { leerDimensionesFoto } from './dimensiones-foto.js';
import { HistoriaAdminDto } from './dto/historia-admin.dto.js';
import { Historia } from './entities/historia.entity.js';
import { aHistoriaAdminDto } from './historia-admin.mapper.js';

const MENSAJE_FALLO = 'No fue posible guardar la fotografía';

@Injectable()
export class FotosHistoriaService {
  private readonly logger = new Logger(FotosHistoriaService.name);

  constructor(
    @InjectRepository(Historia)
    private readonly historias: Repository<Historia>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  /** Sube la foto de la historia; si ya tenía una, la reemplaza. */
  async subir(
    historiaId: string,
    archivo: ArchivoFotoCargado | undefined,
    administradorId: string,
  ): Promise<HistoriaAdminDto> {
    const tipo = validarArchivoFoto(archivo);
    const { buffer, size } = archivo!;
    const { ancho, alto } = leerDimensionesFoto(buffer);

    // Antes de subir nada a Storage.
    await this.exigirHistoria(historiaId);

    const ruta = `historias/${historiaId}/${randomUUID()}.${FORMATOS[tipo]}`;
    try {
      await this.storage.subir(ruta, buffer, tipo);
    } catch {
      throw new ServiceUnavailableException(MENSAJE_FALLO);
    }

    let rutaAnterior: string | null;
    let resultado: HistoriaAdminDto;
    try {
      [rutaAnterior, resultado] = await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          const historias = manager.getRepository(Historia);
          const historia = await historias.findOne({
            where: { id: historiaId, eliminadoEn: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          if (!historia) throw new NotFoundException('La historia no existe');

          const anterior = historia.fotoRuta;
          Object.assign(historia, {
            fotoRuta: ruta,
            fotoContentType: tipo,
            fotoTamano: size,
            fotoAncho: ancho,
            fotoAlto: alto,
            actualizadoPorId: administradorId,
            actualizadoEn: new Date(),
          });
          const guardada = await historias.save(historia);
          return [anterior, aHistoriaAdminDto(guardada, this.storage)] as const;
        },
      );
    } catch (error) {
      await this.limpiar(ruta);
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(MENSAJE_FALLO);
    }

    if (rutaAnterior) await this.limpiar(rutaAnterior);
    return resultado;
  }

  private async exigirHistoria(id: string): Promise<void> {
    let existe: boolean;
    try {
      existe = await this.historias.existsBy({ id, eliminadoEn: IsNull() });
    } catch {
      throw new ServiceUnavailableException(
        'Las historias no están disponibles temporalmente',
      );
    }
    if (!existe) throw new NotFoundException('La historia no existe');
  }

  private async limpiar(ruta: string): Promise<void> {
    await this.storage.eliminar(ruta).catch((error: unknown) => {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage para ${ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    });
  }
}
