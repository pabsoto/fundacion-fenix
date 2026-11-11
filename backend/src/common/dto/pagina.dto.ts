import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const LIMITE_PAGINA_DEFECTO = 10;
export const LIMITE_PAGINA_MAXIMO = 50;

export class ConsultaPaginaDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un entero mayor o igual a 1' })
  @Min(1, { message: 'La página debe ser un entero mayor o igual a 1' })
  pagina?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: LIMITE_PAGINA_MAXIMO,
    default: LIMITE_PAGINA_DEFECTO,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: `El límite debe ser un entero entre 1 y ${LIMITE_PAGINA_MAXIMO}`,
  })
  @Min(1, {
    message: `El límite debe ser un entero entre 1 y ${LIMITE_PAGINA_MAXIMO}`,
  })
  @Max(LIMITE_PAGINA_MAXIMO, {
    message: `El límite debe ser un entero entre 1 y ${LIMITE_PAGINA_MAXIMO}`,
  })
  limite?: number;
}

export class DatosPaginaDto {
  @ApiProperty({ example: 42, description: 'Total de registros del filtro.' })
  readonly total: number;

  @ApiProperty({ example: 1 })
  readonly pagina: number;

  @ApiProperty({ example: LIMITE_PAGINA_DEFECTO })
  readonly limite: number;

  @ApiProperty({ example: 5 })
  readonly totalPaginas: number;
}

/** Normaliza la consulta de paginación y calcula el desplazamiento. */
export function resolverPagina(consulta: ConsultaPaginaDto): {
  pagina: number;
  limite: number;
  desde: number;
} {
  const pagina = consulta.pagina ?? 1;
  const limite = consulta.limite ?? LIMITE_PAGINA_DEFECTO;
  return { pagina, limite, desde: (pagina - 1) * limite };
}

export function datosDePagina(
  total: number,
  pagina: number,
  limite: number,
): DatosPaginaDto {
  return {
    total,
    pagina,
    limite,
    totalPaginas: Math.max(1, Math.ceil(total / limite)),
  };
}
