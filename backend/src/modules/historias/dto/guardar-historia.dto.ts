import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const textoObligatorio = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const textoOpcional = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const limpio = value.trim();
  return limpio === '' ? null : limpio;
};

/** Campos editables de una historia. Se crea siempre oculta. */
export class GuardarHistoriaDto {
  @ApiProperty({ maxLength: 100, example: 'Luna' })
  @Transform(textoObligatorio)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  animalNombre: string;

  @ApiProperty({ maxLength: 200, example: 'Luna encontró un hogar' })
  @Transform(textoObligatorio)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tituloEs: string;

  @ApiProperty({ maxLength: 200, example: 'Luna found a home' })
  @Transform(textoObligatorio)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tituloEn: string;

  @ApiProperty({ maxLength: 4_000 })
  @Transform(textoObligatorio)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  textoEs: string;

  @ApiProperty({ maxLength: 4_000 })
  @Transform(textoObligatorio)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  textoEn: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 100,
    description: 'Firma que se muestra al público.',
  })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  autorNombre?: string | null;

  @ApiProperty({ format: 'date', example: '2026-10-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de la historia debe tener el formato AAAA-MM-DD',
  })
  @IsDateString(
    { strict: true, strictSeparator: true },
    { message: 'La fecha de la historia no es válida' },
  )
  fechaHistoria: string;
}

export class ActualizarHistoriaDto extends GuardarHistoriaDto {
  @ApiProperty({
    description:
      '`true` publica la historia (exige foto) y `false` la oculta del sitio.',
  })
  @IsBoolean()
  visible: boolean;
}
