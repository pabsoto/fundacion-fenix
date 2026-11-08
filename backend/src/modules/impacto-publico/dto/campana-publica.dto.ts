import { ApiProperty } from '@nestjs/swagger';

/**
 * Vista pública de una campaña. Solo incluye datos aptos para visitantes:
 * nunca estado de edición, responsables (`creado_por`, `actualizado_por`),
 * marcas de auditoría ni banderas internas como `es_historico`.
 */
export class CampanaPublicaDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'Campaña de esterilización Villa Adela' })
  readonly tituloEs: string;

  @ApiProperty({
    nullable: true,
    example: 'Villa Adela sterilization campaign',
  })
  readonly tituloEn: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Esterilización gratuita de perros y gatos.',
  })
  readonly descripcionEs: string | null;

  @ApiProperty({ nullable: true, example: 'Free spay and neuter for pets.' })
  readonly descripcionEn: string | null;

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
