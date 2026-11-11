import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReordenarFotosDto {
  @ApiProperty({
    type: String,
    isArray: true,
    format: 'uuid',
    description:
      'Identificadores de todas las fotos de la campaña, en el orden en que deben mostrarse. La primera es la principal.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly ids: string[];
}
