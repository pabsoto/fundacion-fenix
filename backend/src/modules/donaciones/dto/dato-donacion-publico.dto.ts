import { ApiProperty } from '@nestjs/swagger';
import { TextoBilingueDto } from '../../contenido-institucional/dto/contenido-institucional-publico.dto.js';

export class DatoDonacionPublicoDto {
  @ApiProperty({ example: 'Fundación FÉNIX LPB' })
  readonly titular: string;

  @ApiProperty({ example: 'Banco Ejemplo' })
  readonly banco: string;

  @ApiProperty({ example: '+591 70000000' })
  readonly telefono: string;

  @ApiProperty({ example: 'Donación Fundación FÉNIX' })
  readonly referencia: string;

  @ApiProperty({ nullable: true, example: '123-456789-0' })
  readonly numeroCuenta: string | null;

  @ApiProperty({ type: () => TextoBilingueDto })
  readonly aviso: TextoBilingueDto;

  /**
   * Reservado para una URL pública autorizada por la integración futura con
   * Supabase Storage. Nunca contiene `qr_ruta` ni una ubicación interna.
   */
  @ApiProperty({
    nullable: true,
    example: null,
    description:
      'URL pública autorizada del QR. Permanece null hasta implementar Storage.',
  })
  readonly qrUrl: string | null;
}

export class RespuestaDonacionPublicaDto {
  @ApiProperty({ type: () => DatoDonacionPublicoDto, nullable: true })
  readonly donacion: DatoDonacionPublicoDto | null;
}
