import type { StorageService } from '../storage/storage.service.js';
import type { HistoriaAdminDto } from './dto/historia-admin.dto.js';
import type { Historia } from './entities/historia.entity.js';

/** No expone los responsables ni la ruta interna de la foto. */
export function aHistoriaAdminDto(
  historia: Historia,
  storage: StorageService,
): HistoriaAdminDto {
  return {
    id: historia.id,
    animalNombre: historia.animalNombre,
    tituloEs: historia.tituloEs,
    tituloEn: historia.tituloEn,
    textoEs: historia.textoEs,
    textoEn: historia.textoEn,
    autorNombre: historia.autorNombre,
    fechaHistoria: historia.fechaHistoria,
    orden: historia.orden,
    visible: historia.visible,
    foto: historia.fotoRuta
      ? {
          url: storage.obtenerUrlPublica(historia.fotoRuta),
          ancho: historia.fotoAncho!,
          alto: historia.fotoAlto!,
        }
      : null,
    creadoEn: new Date(historia.creadoEn).toISOString(),
    actualizadoEn: new Date(historia.actualizadoEn).toISOString(),
  };
}
