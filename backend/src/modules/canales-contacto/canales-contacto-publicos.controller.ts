import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CanalesContactoPublicosService } from './canales-contacto-publicos.service.js';
import { CanalContactoPublicoDto } from './dto/canal-contacto-publico.dto.js';

@Controller('public/contactos')
@ApiTags('Contactos públicos')
export class CanalesContactoPublicosController {
  constructor(private readonly servicio: CanalesContactoPublicosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar canales de contacto activos',
    description:
      'Devuelve canales activos con sus textos bilingües, ordenados por orden y tipo. Si no hay canales devuelve una lista vacía.',
  })
  @ApiOkResponse({
    description: 'Canales de contacto públicos.',
    type: CanalContactoPublicoDto,
    isArray: true,
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
    type: ErrorResponseDto,
  })
  listar(): Promise<CanalContactoPublicoDto[]> {
    return this.servicio.listarActivos();
  }
}
