import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ESTADOS_CAMPANA,
  type EstadoCampana,
} from '../entities/campana.entity.js';
import { CampanaAdminDto, TotalesCampanaDto } from './campana-admin.dto.js';

export class ConsultaCifrasDto {
  @ApiProperty({ minimum: 2000, maximum: 2100, example: 2026 })
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un entero entre 2000 y 2100' })
  @Min(2000, { message: 'El año debe ser un entero entre 2000 y 2100' })
  @Max(2100, { message: 'El año debe ser un entero entre 2000 y 2100' })
  anio: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12, example: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El mes debe ser un entero entre 1 y 12' })
  @Min(1, { message: 'El mes debe ser un entero entre 1 y 12' })
  @Max(12, { message: 'El mes debe ser un entero entre 1 y 12' })
  mes?: number;

  @ApiPropertyOptional({ enum: ESTADOS_CAMPANA })
  @IsOptional()
  @IsIn(ESTADOS_CAMPANA, {
    message: 'El estado debe ser borrador, publicada o cerrada',
  })
  estado?: EstadoCampana;
}

export class PeriodoCifrasDto {
  @ApiProperty({ example: 2026 })
  readonly anio: number;

  @ApiProperty({ nullable: true, example: 11 })
  readonly mes: number | null;
}

export class CifrasPeriodoDto {
  @ApiProperty({ type: PeriodoCifrasDto })
  readonly periodo: PeriodoCifrasDto;

  @ApiProperty({ type: TotalesCampanaDto })
  readonly totales: TotalesCampanaDto;

  @ApiProperty({ type: CampanaAdminDto, isArray: true })
  readonly campanas: CampanaAdminDto[];
}
