import { ApiProperty } from '@nestjs/swagger';

/** Foto lista para mostrar. La ruta interna del archivo no sale de la API. */
export class FotoHistoriaPublicaDto {
  @ApiProperty({
    format: 'uri',
    description: 'URL pública armada por el backend.',
  })
  readonly url: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Ancho visible en píxeles, ya con la orientación aplicada.',
  })
  readonly ancho: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Alto visible en píxeles, ya con la orientación aplicada.',
  })
  readonly alto: number | null;
}

/**
 * Vista pública de una historia destacada.
 * No incluye orden, visibilidad, responsables ni fechas internas.
 */
export class HistoriaPublicaDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty({ example: 'Luna' })
  readonly animalNombre: string;

  @ApiProperty()
  readonly tituloEs: string;

  @ApiProperty()
  readonly tituloEn: string;

  @ApiProperty()
  readonly textoEs: string;

  @ApiProperty()
  readonly textoEn: string;

  @ApiProperty({ type: String, nullable: true })
  readonly autorNombre: string | null;

  @ApiProperty({ format: 'date', example: '2026-10-01' })
  readonly fechaHistoria: string;

  @ApiProperty({ type: () => FotoHistoriaPublicaDto, nullable: true })
  readonly foto: FotoHistoriaPublicaDto | null;
}
