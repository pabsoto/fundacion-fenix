import { ApiProperty } from '@nestjs/swagger';

export class CampanaPublicaDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'Villa Adela, El Alto' })
  readonly lugar: string;

  @ApiProperty({ format: 'date', example: '2025-03-15' })
  readonly fecha: string;

  @ApiProperty({ example: 40 })
  readonly perros: number;

  @ApiProperty({ example: 24 })
  readonly gatos: number;

  @ApiProperty({ example: 30 })
  readonly machos: number;

  @ApiProperty({ example: 34 })
  readonly hembras: number;

  @ApiProperty({ example: 64 })
  readonly total: number;

  @ApiProperty({ type: String, isArray: true })
  readonly fotos: string[];
}
