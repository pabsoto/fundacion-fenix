import { ApiProperty } from '@nestjs/swagger';

export class FotoAnimalDto {
  @ApiProperty({ format: 'uuid' })
  readonly animalId: string;

  @ApiProperty({ format: 'uri' })
  readonly url: string;

  @ApiProperty({ example: 300 })
  readonly expiraEnSegundos: number;
}
