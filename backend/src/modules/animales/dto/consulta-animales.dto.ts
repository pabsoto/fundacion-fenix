import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ConsultaPaginaDto,
  DatosPaginaDto,
} from '../../../common/dto/pagina.dto.js';
import {
  CampoFormatoExportacion,
  type FormatoExportacion,
} from '../../../common/dto/formato-exportacion.js';
import { AnimalDto } from './animal.dto.js';

export class ConsultaAnimalesDto extends ConsultaPaginaDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  adoptado?: boolean;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Busca en el nombre. Varias palabras exigen todas.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const limpio = value.trim().replace(/\s+/g, ' ');
    return limpio === '' ? undefined : limpio;
  })
  @IsString()
  @MaxLength(120)
  q?: string;
}

/** Filtros de la lista más el formato; `pagina` y `limite` se ignoran. */
export class ConsultaExportarAnimalesDto extends ConsultaAnimalesDto {
  @CampoFormatoExportacion()
  formato: FormatoExportacion;
}

export class PaginaAnimalesDto extends DatosPaginaDto {
  @ApiProperty({ type: AnimalDto, isArray: true })
  readonly items: AnimalDto[];
}
