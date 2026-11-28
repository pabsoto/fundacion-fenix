import type { StorageService } from '../storage/storage.service.js';
import type { HistoriaPublicaDto } from './dto/historia-publica.dto.js';
import type { Historia } from './entities/historia.entity.js';

/** `YYYY-MM-DD` aunque el driver entregue la columna `date` como `Date`. */
function fechaPublica(fecha: string | Date): string {
  if (typeof fecha === 'string') return fecha.slice(0, 10);
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Solo los campos que puede ver un visitante. */
export function aHistoriaPublicaDto(
  historia: Historia,
  storage: StorageService,
): HistoriaPublicaDto {
  return {
    id: historia.id,
    animalNombre: historia.animalNombre,
    tituloEs: historia.tituloEs,
    tituloEn: historia.tituloEn,
    textoEs: historia.textoEs,
    textoEn: historia.textoEn,
    autorNombre: historia.autorNombre,
    fechaHistoria: fechaPublica(historia.fechaHistoria),
    foto: historia.fotoRuta
      ? {
          url: storage.obtenerUrlPublica(historia.fotoRuta),
          ancho: historia.fotoAncho,
          alto: historia.fotoAlto,
        }
      : null,
  };
}
