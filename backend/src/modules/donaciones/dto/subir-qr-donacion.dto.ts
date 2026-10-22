import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

export class SubirQrDonacionDto {
  @ApiPropertyOptional({
    format: 'date',
    example: '2027-12-31',
    description: 'Fecha hasta la que el QR se considera vigente, inclusive.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  qrVenceEl?: string;
}

export class ArchivoQrSwaggerDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  archivo: string;

  @ApiPropertyOptional({ format: 'date', example: '2027-12-31' })
  qrVenceEl?: string;
}

export class EstadoQrDonacionDto {
  @ApiProperty({ example: true })
  readonly disponible: boolean;

  @ApiProperty({ nullable: true, format: 'date', example: '2027-12-31' })
  readonly venceEl: string | null;
}

export class ResultadoQrDonacionDto {
  @ApiProperty({ type: () => EstadoQrDonacionDto })
  readonly qr: EstadoQrDonacionDto;
}
