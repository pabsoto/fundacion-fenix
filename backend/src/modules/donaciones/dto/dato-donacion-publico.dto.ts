import { TextoBilingueDto } from '../../contenido-institucional/dto/contenido-institucional-publico.dto.js';

export class DatoDonacionPublicoDto {
  readonly titular: string;
  readonly banco: string;
  readonly telefono: string;
  readonly referencia: string;
  readonly numeroCuenta: string | null;
  readonly aviso: TextoBilingueDto;

  /**
   * Reservado para una URL pública autorizada por la integración futura con
   * Supabase Storage. Nunca contiene `qr_ruta` ni una ubicación interna.
   */
  readonly qrUrl: string | null;
}

export class RespuestaDonacionPublicaDto {
  readonly donacion: DatoDonacionPublicoDto | null;
}
