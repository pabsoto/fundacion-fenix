import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
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

export const ESPECIES = ['perro', 'gato'] as const;
export const SEXOS = ['macho', 'hembra'] as const;
export const EDAD_UNIDADES = ['anios', 'meses'] as const;

const texto = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const OPCIONES_FECHA = { strict: true, strictSeparator: true };

const estaAdoptado = (dto: RegistrarAnimalDto): boolean =>
  dto.adoptado === true;

export class RegistrarAnimalDto {
  @ApiProperty({ maxLength: 100, example: 'Luna' })
  @Transform(texto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ enum: ESPECIES })
  @IsIn(ESPECIES)
  especie: (typeof ESPECIES)[number];

  @ApiPropertyOptional({ enum: SEXOS, nullable: true })
  @IsOptional()
  @IsIn(SEXOS)
  sexo?: (typeof SEXOS)[number] | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 40 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  edad?: number | null;

  @ApiPropertyOptional({ enum: EDAD_UNIDADES, nullable: true })
  @ValidateIf((dto: RegistrarAnimalDto) => dto.edad != null)
  @IsIn(EDAD_UNIDADES)
  edadUnidad?: (typeof EDAD_UNIDADES)[number] | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-01-15' })
  @IsOptional()
  @Matches(FORMATO_FECHA)
  @IsDateString(OPCIONES_FECHA)
  fechaIngreso?: string | null;

  @ApiProperty({ description: 'Indica si el animal ya fue adoptado.' })
  @IsBoolean()
  adoptado: boolean;

  @ApiPropertyOptional({
    maxLength: 150,
    description: 'Obligatorio si el animal está adoptado.',
  })
  @ValidateIf(estaAdoptado)
  @Transform(texto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreAdoptante?: string;

  @ApiPropertyOptional({
    maxLength: 300,
    description: 'Obligatorio si el animal está adoptado.',
  })
  @ValidateIf(estaAdoptado)
  @Transform(texto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  direccionAdoptante?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Obligatorio si el animal está adoptado.',
  })
  @ValidateIf(estaAdoptado)
  @Matches(FORMATO_FECHA)
  @IsDateString(OPCIONES_FECHA)
  fechaAdopcion?: string;
}
