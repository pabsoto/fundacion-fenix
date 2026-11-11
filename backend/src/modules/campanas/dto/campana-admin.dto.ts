import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_CAMPANA,
  type EstadoCampana,
} from '../entities/campana.entity.js';

export class TotalesCampanaDto {
  @ApiProperty({ example: 32 })
  readonly perros: number;

  @ApiProperty({ example: 23 })
  readonly gatos: number;

  @ApiProperty({ example: 20 })
  readonly machos: number;

  @ApiProperty({ example: 35 })
  readonly hembras: number;

  @ApiProperty({ example: 55 })
  readonly total: number;
}

export class CampanaAdminDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'Campaña de esterilización Villa Adela' })
  readonly tituloEs: string;

  @ApiProperty({
    nullable: true,
    example: 'Villa Adela sterilization campaign',
  })
  readonly tituloEn: string | null;

  @ApiProperty({ nullable: true })
  readonly descripcionEs: string | null;

  @ApiProperty({ nullable: true })
  readonly descripcionEn: string | null;

  @ApiProperty({ nullable: true, example: 'Villa Adela, El Alto' })
  readonly lugar: string | null;

  @ApiProperty({ nullable: true, format: 'date', example: '2026-11-21' })
  readonly fecha: string | null;

  @ApiProperty({ enum: ESTADOS_CAMPANA, example: 'borrador' })
  readonly estado: EstadoCampana;

  @ApiProperty({ example: 12 })
  readonly perrosMachos: number;

  @ApiProperty({ example: 20 })
  readonly perrosHembras: number;

  @ApiProperty({ example: 8 })
  readonly gatosMachos: number;

  @ApiProperty({ example: 15 })
  readonly gatosHembras: number;

  @ApiProperty({ type: TotalesCampanaDto })
  readonly totales: TotalesCampanaDto;

  @ApiProperty({ example: false })
  readonly esHistorico: boolean;

  @ApiProperty({
    type: String,
    isArray: true,
    description: 'URLs públicas de las fotografías, en el orden de la galería.',
  })
  readonly fotos: string[];

  @ApiProperty({ format: 'date-time' })
  readonly creadoEn: string;

  @ApiProperty({ format: 'date-time' })
  readonly actualizadoEn: string;
}
