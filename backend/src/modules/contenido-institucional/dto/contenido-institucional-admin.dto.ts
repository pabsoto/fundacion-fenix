import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const limpiarTexto = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ContenidoInstitucionalAdminDto {
  @ApiProperty({ example: 'hero_principal' })
  readonly clave: string;

  @ApiProperty({ nullable: true }) readonly tituloEs: string | null;
  @ApiProperty({ nullable: true }) readonly tituloEn: string | null;
  @ApiProperty({ nullable: true }) readonly textoEs: string | null;
  @ApiProperty({ nullable: true }) readonly textoEn: string | null;
  @ApiProperty({ nullable: true }) readonly imagenRuta: string | null;

  @ApiProperty({
    nullable: true,
    description: 'URL pública de la imagen, armada por el backend.',
    example:
      'https://proyecto.supabase.co/storage/v1/object/public/fenix-donaciones/contenido/hero_principal/archivo.jpg',
  })
  readonly imagenUrl: string | null;
  @ApiProperty({ example: 1 }) readonly orden: number;
  @ApiProperty() readonly visible: boolean;
  @ApiProperty({ format: 'date-time' }) readonly actualizadoEn: Date;
}

export class ActualizarContenidoDto {
  @ApiProperty({ maxLength: 4_000 })
  @Transform(limpiarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  textoEs: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 4_000 })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  @IsOptional()
  textoEn?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 300 })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  tituloEs?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 300 })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  @IsOptional()
  tituloEn?: string | null;

  @ApiProperty()
  @IsBoolean()
  visible: boolean;
}
