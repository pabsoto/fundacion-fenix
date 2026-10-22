import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { ContenidoInstitucionalPublicoService } from './contenido-institucional-publico.service.js';
import { ContenidoInstitucionalPublicoDto } from './dto/contenido-institucional-publico.dto.js';

@Controller('public/institucional')
@ApiTags('Contenido institucional')
export class ContenidoInstitucionalPublicoController {
  constructor(
    private readonly servicio: ContenidoInstitucionalPublicoService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar contenido institucional visible',
    description:
      'Devuelve los textos bilingües visibles, ordenados por orden y clave. Una tabla sin contenido produce una lista vacía.',
  })
  @ApiOkResponse({
    description: 'Contenido institucional público.',
    type: ContenidoInstitucionalPublicoDto,
    isArray: true,
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
    type: ErrorResponseDto,
  })
  listar(): Promise<ContenidoInstitucionalPublicoDto[]> {
    return this.servicio.listarVisibles();
  }
}
