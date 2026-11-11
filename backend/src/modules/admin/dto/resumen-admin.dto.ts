import { ApiProperty } from '@nestjs/swagger';

export class EsterilizacionesResumenDto {
  @ApiProperty({ example: 310, description: 'Suma de los cuatro contadores de todas las campañas.' })
  readonly total: number;

  @ApiProperty({ example: 4, description: 'Cantidad de campañas.' })
  readonly jornadas: number;
}

export class EnLaFundacionResumenDto {
  @ApiProperty({ example: 4, description: 'Animales que todavía no fueron adoptados.' })
  readonly cantidad: number;

  @ApiProperty({ example: 8, description: 'Animales registrados.' })
  readonly registrados: number;
}

export class AdopcionesDelAnioResumenDto {
  @ApiProperty({ example: 4 })
  readonly cantidad: number;

  @ApiProperty({ example: 2026 })
  readonly anio: number;
}

export class PuntoMensualResumenDto {
  @ApiProperty({ example: 2026 })
  readonly anio: number;

  @ApiProperty({ example: 11, minimum: 1, maximum: 12 })
  readonly mes: number;

  @ApiProperty({ example: 2 })
  readonly ingresos: number;

  @ApiProperty({ example: 1 })
  readonly adopciones: number;
}

export class AnimalEnEsperaResumenDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'Pelusa' })
  readonly nombre: string;

  @ApiProperty({ example: 'gato' })
  readonly especie: string;

  @ApiProperty({ example: 215, description: 'Días desde el ingreso hasta hoy.' })
  readonly dias: number;
}

export class ResumenAdminDto {
  @ApiProperty({ type: EsterilizacionesResumenDto })
  readonly esterilizaciones: EsterilizacionesResumenDto;

  @ApiProperty({ type: EnLaFundacionResumenDto })
  readonly enLaFundacion: EnLaFundacionResumenDto;

  @ApiProperty({ type: AdopcionesDelAnioResumenDto })
  readonly adopcionesDelAnio: AdopcionesDelAnioResumenDto;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 196,
    description:
      'Promedio de días entre el ingreso y la adopción. Nulo si ningún animal tiene ambas fechas.',
  })
  readonly diasHastaAdoptar: number | null;

  @ApiProperty({
    type: PuntoMensualResumenDto,
    isArray: true,
    description: 'Los últimos doce meses; el último es el mes actual.',
  })
  readonly serie: PuntoMensualResumenDto[];

  @ApiProperty({
    type: AnimalEnEsperaResumenDto,
    isArray: true,
    description:
      'Hasta 4 animales sin adoptar, del ingreso más antiguo al más reciente.',
  })
  readonly espera: AnimalEnEsperaResumenDto[];
}
