import { ApiProperty } from '@nestjs/swagger';
import type { TipoCanalContacto } from '../entities/canal-contacto.entity.js';

export class TextoCanalContactoDto {
  @ApiProperty({ nullable: true, example: 'Escríbenos por WhatsApp' })
  readonly es: string | null;

  @ApiProperty({ nullable: true, example: 'Message us on WhatsApp' })
  readonly en: string | null;
}

export class CanalContactoPublicoDto {
  @ApiProperty({
    enum: ['whatsapp', 'facebook', 'instagram', 'tiktok', 'email'],
    example: 'whatsapp',
  })
  readonly tipo: TipoCanalContacto;

  @ApiProperty({ example: 'https://wa.me/59170000000' })
  readonly url: string;

  @ApiProperty({ type: () => TextoCanalContactoDto })
  readonly texto: TextoCanalContactoDto;

  @ApiProperty({ example: 1 })
  readonly orden: number;
}
