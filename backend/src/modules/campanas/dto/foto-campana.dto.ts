import { ApiProperty } from '@nestjs/swagger';

export class ArchivoFotoSwaggerDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  archivo: string;
}

export class FotoCampanaDto {
  @ApiProperty({ format: 'uuid' })
  readonly id: string;

  @ApiProperty({ format: 'uuid' })
  readonly campanaId: string;

  @ApiProperty({ example: 1 })
  readonly orden: number;

  @ApiProperty({ format: 'uri' })
  readonly url: string;
}
