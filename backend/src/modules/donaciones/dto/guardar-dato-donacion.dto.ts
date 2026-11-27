import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const limpiarTexto = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class GuardarDatoDonacionDto {
  @ApiProperty({ maxLength: 200, example: 'Fundación FÉNIX LPB' })
  @Transform(limpiarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titular: string;

  @ApiProperty({ maxLength: 200, example: 'Banco Ejemplo' })
  @Transform(limpiarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  banco: string;

  @ApiProperty({ maxLength: 100, example: '+591 70000000' })
  @Transform(limpiarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  telefono: string;

  @ApiProperty({ maxLength: 500, example: 'Donación Fundación FÉNIX' })
  @Transform(limpiarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  referencia: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 200,
    example: '123-456789-0',
  })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  numeroCuenta?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 2_000,
    example: 'Verifique los datos antes de donar.',
  })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  @IsOptional()
  avisoEs?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 2_000,
    example: 'Verify the details before donating.',
  })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  @IsOptional()
  avisoEn?: string | null;

  @ApiPropertyOptional({ example: true })
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date',
    example: '2027-12-31',
    description:
      'Fecha inclusive de vigencia del QR ya guardado. null la quita. Omitirla conserva la actual. No sustituye la imagen.',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  qrVenceEl?: string | null;
}
