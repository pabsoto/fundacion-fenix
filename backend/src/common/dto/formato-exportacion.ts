import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const FORMATOS_EXPORTACION = ['csv'] as const;
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number];

/** Decorador del parámetro obligatorio `formato` de los endpoints de exportación. */
export function CampoFormatoExportacion(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ enum: FORMATOS_EXPORTACION, example: 'csv' }),
    IsIn(FORMATOS_EXPORTACION, {
      message: `El formato debe ser uno de: ${FORMATOS_EXPORTACION.join(', ')}`,
    }),
  );
}
