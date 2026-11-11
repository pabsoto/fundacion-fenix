import { ApiProperty } from '@nestjs/swagger';

export class AnimalDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty()
  readonly nombre: string;

  @ApiProperty({ enum: ['perro', 'gato'] })
  readonly especie: string;

  @ApiProperty({ nullable: true, type: String })
  readonly sexo: string | null;

  @ApiProperty({ nullable: true, type: Number })
  readonly edad: number | null;

  @ApiProperty({ nullable: true, type: String })
  readonly edadUnidad: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly fechaIngreso: string | null;

  @ApiProperty()
  readonly adoptado: boolean;

  @ApiProperty({ nullable: true, type: String })
  readonly nombreAdoptante: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly direccionAdoptante: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly fechaAdopcion: string | null;

  @ApiProperty({ description: 'Indica si ya se subió la foto del animal.' })
  readonly tieneFotoAnimal: boolean;

  @ApiProperty({ description: 'Indica si ya se subió la foto de la entrega.' })
  readonly tieneFotoEntrega: boolean;

  @ApiProperty()
  readonly creadoEn: string;

  @ApiProperty()
  readonly actualizadoEn: string;
}
