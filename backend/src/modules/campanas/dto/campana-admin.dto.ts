import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_CAMPANA,
  type EstadoCampana,
} from '../entities/campana.entity.js';

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

  @ApiProperty({ example: false })
  readonly esHistorico: boolean;

  @ApiProperty({ format: 'date-time' })
  readonly creadoEn: string;

  @ApiProperty({ format: 'date-time' })
  readonly actualizadoEn: string;
}
