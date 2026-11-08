import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const ESTADOS_EDITABLES = ['borrador', 'publicada'] as const;
export type EstadoEditable = (typeof ESTADOS_EDITABLES)[number];

const textoOpcional = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const limpio = value.trim();
  return limpio === '' ? null : limpio;
};

const textoObligatorio = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const esPublicada = (objeto: GuardarCampanaDto): boolean =>
  objeto.estado === 'publicada';

const MAXIMO_CONTADOR = 100000;

const contador = (campo: string) => ({
  message: `${campo} debe ser un entero entre 0 y ${MAXIMO_CONTADOR}`,
});

export class GuardarCampanaDto {
  @ApiProperty({
    maxLength: 200,
    example: 'Campaña de esterilización Villa Adela',
  })
  @Transform(textoObligatorio)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tituloEs: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 200,
    example: 'Villa Adela sterilization campaign',
  })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tituloEn?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcionEs?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcionEn?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 200,
    example: 'Villa Adela, El Alto',
    description: 'Obligatorio cuando el estado es `publicada`.',
  })
  @Transform(textoOpcional)
  @ValidateIf(
    (objeto: GuardarCampanaDto, valor) => esPublicada(objeto) || valor != null,
  )
  @IsString({ message: 'El lugar es obligatorio para publicar la campaña' })
  @IsNotEmpty()
  @MaxLength(200)
  lugar?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'date',
    example: '2026-11-21',
    description: 'Obligatoria cuando el estado es `publicada`.',
  })
  @Transform(textoOpcional)
  @ValidateIf(
    (objeto: GuardarCampanaDto, valor) => esPublicada(objeto) || valor != null,
  )
  @IsString({ message: 'La fecha es obligatoria para publicar la campaña' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener el formato AAAA-MM-DD',
  })
  @IsDateString(
    { strict: true, strictSeparator: true },
    { message: 'La fecha no es válida' },
  )
  fecha?: string | null;

  @ApiProperty({ enum: ESTADOS_EDITABLES, example: 'borrador' })
  @IsIn(ESTADOS_EDITABLES, {
    message: 'El estado debe ser borrador o publicada',
  })
  estado: EstadoEditable;

  @ApiPropertyOptional({ minimum: 0, maximum: MAXIMO_CONTADOR, example: 12 })
  @IsOptional()
  @IsInt(contador('perrosMachos'))
  @Min(0, contador('perrosMachos'))
  @Max(MAXIMO_CONTADOR, contador('perrosMachos'))
  perrosMachos?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: MAXIMO_CONTADOR, example: 20 })
  @IsOptional()
  @IsInt(contador('perrosHembras'))
  @Min(0, contador('perrosHembras'))
  @Max(MAXIMO_CONTADOR, contador('perrosHembras'))
  perrosHembras?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: MAXIMO_CONTADOR, example: 8 })
  @IsOptional()
  @IsInt(contador('gatosMachos'))
  @Min(0, contador('gatosMachos'))
  @Max(MAXIMO_CONTADOR, contador('gatosMachos'))
  gatosMachos?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: MAXIMO_CONTADOR, example: 15 })
  @IsOptional()
  @IsInt(contador('gatosHembras'))
  @Min(0, contador('gatosHembras'))
  @Max(MAXIMO_CONTADOR, contador('gatosHembras'))
  gatosHembras?: number;
}
