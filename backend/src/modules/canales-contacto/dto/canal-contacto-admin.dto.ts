import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { TipoCanalContacto } from '../entities/canal-contacto.entity.js';

export const TIPOS_CANAL: readonly TipoCanalContacto[] = [
  'whatsapp',
  'facebook',
  'instagram',
  'tiktok',
  'email',
];

const limpiarTexto = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CanalContactoAdminDto {
  @ApiProperty({ enum: TIPOS_CANAL }) readonly tipo: TipoCanalContacto;
  @ApiProperty({ example: 'https://wa.me/59170000000' }) readonly url: string;
  @ApiProperty({ nullable: true }) readonly textoEs: string | null;
  @ApiProperty({ nullable: true }) readonly textoEn: string | null;
  @ApiProperty() readonly orden: number;
  @ApiProperty() readonly activo: boolean;
  @ApiProperty({ format: 'date-time' }) readonly actualizadoEn: Date;
}

export class ActualizarCanalDto {
  @ApiProperty({ maxLength: 500, example: 'https://wa.me/59170000000' })
  @Transform(limpiarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/^(https:\/\/|mailto:)\S+$/i, {
    message: 'url must start with https:// or mailto:',
  })
  url: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 200 })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  textoEs?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 200 })
  @Transform(limpiarTexto)
  @ValidateIf((_objeto, valor) => valor !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  textoEn?: string | null;

  @ApiProperty()
  @IsBoolean()
  activo: boolean;
}
