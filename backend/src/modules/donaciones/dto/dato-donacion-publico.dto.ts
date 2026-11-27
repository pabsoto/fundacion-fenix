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

  @ApiProperty({
    nullable: true,
    example:
      'https://proyecto.supabase.co/storage/v1/object/public/fenix-donaciones/qr/id/archivo.png',
    description:
      'URL pública del QR vigente. Es null si no hay archivo, si está vencido en America/La_Paz o si no se puede armar la URL. No es la ruta interna.',
  })
  readonly qrUrl: string | null;
}

export class RespuestaDonacionPublicaDto {
  @ApiProperty({ type: () => DatoDonacionPublicoDto, nullable: true })
  readonly donacion: DatoDonacionPublicoDto | null;
}
