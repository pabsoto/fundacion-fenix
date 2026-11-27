import { ApiProperty } from '@nestjs/swagger';
import { EstadoQrDonacionDto } from './subir-qr-donacion.dto.js';

export class DatoDonacionAdminDto {
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

  @ApiProperty({
    nullable: true,
    example: 'Verifique los datos antes de donar.',
  })
  readonly avisoEs: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Verify the details before donating.',
  })
  readonly avisoEn: string | null;

  @ApiProperty({ example: true })
  readonly activo: boolean;

  @ApiProperty({
    nullable: true,
    example:
      'https://proyecto.supabase.co/storage/v1/object/public/fenix-donaciones/qr/id/archivo.png',
    description:
      'URL pública del QR guardado, también si está vencido. null si no hay archivo. No es la ruta interna.',
  })
  readonly qrUrl: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-01-01T00:00:00.000Z',
  })
  readonly actualizadoEn: string;

  @ApiProperty({ type: () => EstadoQrDonacionDto })
  readonly qr: EstadoQrDonacionDto;
}

export class RespuestaDonacionAdminDto {
  @ApiProperty({ type: () => DatoDonacionAdminDto, nullable: true })
  readonly donacion: DatoDonacionAdminDto | null;
}

export class ResultadoGuardarDonacionDto {
  @ApiProperty({ enum: ['INSERT', 'UPDATE'], example: 'UPDATE' })
  readonly accion: 'INSERT' | 'UPDATE';

  @ApiProperty({ type: () => DatoDonacionAdminDto })
  readonly donacion: DatoDonacionAdminDto;
}

export class ResultadoDesactivarDonacionDto {
  @ApiProperty({ example: true })
  readonly desactivada: boolean;
}
