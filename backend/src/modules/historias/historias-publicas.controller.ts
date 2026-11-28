import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { HistoriaPublicaDto } from './dto/historia-publica.dto.js';
import { HistoriasPublicasService } from './historias-publicas.service.js';

@Controller('public/historias')
@ApiTags('Historias públicas')
export class HistoriasPublicasController {
  constructor(private readonly servicio: HistoriasPublicasService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar historias destacadas visibles',
    description:
      'Devuelve solo historias visibles y no eliminadas, ordenadas por `orden`. Una tabla vacía produce una lista vacía.',
  })
  @ApiOkResponse({ type: HistoriaPublicaDto, isArray: true })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
    type: ErrorResponseDto,
  })
  listar(): Promise<HistoriaPublicaDto[]> {
    return this.servicio.listar();
  }
}
