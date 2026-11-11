import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  ConsultaPaginaDto,
  DatosPaginaDto,
} from '../../../common/dto/pagina.dto.js';
import { CampanaAdminDto, TotalesCampanaDto } from './campana-admin.dto.js';

export class ConsultaCampanasDto extends ConsultaPaginaDto {
  @ApiPropertyOptional({ minimum: 2000, maximum: 2100, example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un entero entre 2000 y 2100' })
  @Min(2000, { message: 'El año debe ser un entero entre 2000 y 2100' })
  @Max(2100, { message: 'El año debe ser un entero entre 2000 y 2100' })
  anio?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12, example: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El mes debe ser un entero entre 1 y 12' })
  @Min(1, { message: 'El mes debe ser un entero entre 1 y 12' })
  @Max(12, { message: 'El mes debe ser un entero entre 1 y 12' })
  mes?: number;
}

export class ContadoresCampanaDto {
  @ApiProperty({ example: 12 })
  readonly perrosMachos: number;

  @ApiProperty({ example: 20 })
  readonly perrosHembras: number;

  @ApiProperty({ example: 8 })
  readonly gatosMachos: number;

  @ApiProperty({ example: 15 })
  readonly gatosHembras: number;
}

export class PaginaCampanasDto extends DatosPaginaDto {
  @ApiProperty({ type: CampanaAdminDto, isArray: true })
  readonly items: CampanaAdminDto[];

  @ApiProperty({
    type: ContadoresCampanaDto,
    description: 'Suma de todas las campañas del filtro, no solo de la página.',
  })
  readonly contadores: ContadoresCampanaDto;

  @ApiProperty({ type: TotalesCampanaDto })
  readonly totales: TotalesCampanaDto;

  @ApiProperty({
    type: Number,
    isArray: true,
    description: 'Años con campañas, del más reciente al más antiguo.',
  })
  readonly anios: number[];

  @ApiProperty({
    type: Number,
    isArray: true,
    description:
      'Meses (1-12) con campañas en el año elegido, o en cualquier año si no se filtra por año.',
  })
  readonly meses: number[];
}
