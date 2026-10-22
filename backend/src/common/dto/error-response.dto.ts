import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Unauthorized' })
  error: string;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'No hay una sesión administrativa activa' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['titular should not be empty'],
      },
    ],
  })
  message: string | string[];

  @ApiProperty({ format: 'date-time', example: '2026-10-22T15:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/admin/donaciones' })
  path: string;
}
