import { ApiProperty } from '@nestjs/swagger';

export class TextoBilingueDto {
  @ApiProperty({ nullable: true, example: 'Nuestra misión' })
  readonly es: string | null;

  @ApiProperty({ nullable: true, example: 'Our mission' })
  readonly en: string | null;
}

export class ContenidoInstitucionalPublicoDto {
  @ApiProperty({ example: 'mision' })
  readonly clave: string;

  @ApiProperty({ type: () => TextoBilingueDto })
  readonly titulo: TextoBilingueDto;

  @ApiProperty({ type: () => TextoBilingueDto })
  readonly descripcion: TextoBilingueDto;

  @ApiProperty({
    nullable: true,
    example: 'https://cdn.ejemplo.org/institucional/mision.webp',
  })
  readonly imagenUrl: string | null;

  @ApiProperty({ example: 1 })
  readonly orden: number;
}
