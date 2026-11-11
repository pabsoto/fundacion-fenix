import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

const MAXIMO_CONTADOR = 100000;

export class CorregirCifrasCampanaDto {
  @ApiProperty({ minimum: 0, maximum: MAXIMO_CONTADOR })
  @IsInt()
  @Min(0)
  @Max(MAXIMO_CONTADOR)
  perrosMachos: number;

  @ApiProperty({ minimum: 0, maximum: MAXIMO_CONTADOR })
  @IsInt()
  @Min(0)
  @Max(MAXIMO_CONTADOR)
  perrosHembras: number;

  @ApiProperty({ minimum: 0, maximum: MAXIMO_CONTADOR })
  @IsInt()
  @Min(0)
  @Max(MAXIMO_CONTADOR)
  gatosMachos: number;

  @ApiProperty({ minimum: 0, maximum: MAXIMO_CONTADOR })
  @IsInt()
  @Min(0)
  @Max(MAXIMO_CONTADOR)
  gatosHembras: number;
}
