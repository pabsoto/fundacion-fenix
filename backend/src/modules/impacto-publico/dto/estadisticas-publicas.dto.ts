import { ApiProperty } from '@nestjs/swagger';

export class EstadisticaEspecieDto {
  @ApiProperty({ example: 725 })
  readonly total: number;

  @ApiProperty({ example: 350 })
  readonly machos: number;

  @ApiProperty({ example: 375 })
  readonly hembras: number;
}

export class EstadisticasPublicasDto {
  @ApiProperty({ type: EstadisticaEspecieDto })
  readonly caninos: EstadisticaEspecieDto;

  @ApiProperty({ type: EstadisticaEspecieDto })
  readonly felinos: EstadisticaEspecieDto;
}
