import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Comprobar el estado del backend',
    description:
      'Ejecuta una consulta de solo lectura para informar si PostgreSQL está disponible.',
  })
  @ApiOkResponse({
    description: 'Backend y PostgreSQL disponibles.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'El backend está activo, pero PostgreSQL no está disponible.',
    type: HealthResponseDto,
  })
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponseDto> {
    const health = await this.healthService.check();
    if (health.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
