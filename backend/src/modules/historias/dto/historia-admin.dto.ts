import { ApiProperty } from '@nestjs/swagger';

export class FotoHistoriaDto {
  @ApiProperty({ format: 'uri' })
  readonly url: string;

  @ApiProperty({ example: 1200, description: 'Ancho visible en píxeles.' })
  readonly ancho: number;

  @ApiProperty({ example: 1600, description: 'Alto visible en píxeles.' })
  readonly alto: number;
}

export class HistoriaAdminDto {
  @ApiProperty({ format: 'uuid' }) readonly id: string;
  @ApiProperty({ example: 'Luna' }) readonly animalNombre: string;
  @ApiProperty() readonly tituloEs: string;
  @ApiProperty() readonly tituloEn: string;
  @ApiProperty() readonly textoEs: string;
  @ApiProperty() readonly textoEn: string;
  @ApiProperty({ type: String, nullable: true })
  readonly autorNombre: string | null;
  @ApiProperty({ format: 'date' }) readonly fechaHistoria: string;
  @ApiProperty({ example: 1 }) readonly orden: number;
  @ApiProperty() readonly visible: boolean;
  @ApiProperty({ type: () => FotoHistoriaDto, nullable: true })
  readonly foto: FotoHistoriaDto | null;
  @ApiProperty({ format: 'date-time' }) readonly creadoEn: string;
  @ApiProperty({ format: 'date-time' }) readonly actualizadoEn: string;
}
