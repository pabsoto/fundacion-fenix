import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CampanaPublicaDto } from './dto/campana-publica.dto.js';
import { EstadisticasPublicasDto } from './dto/estadisticas-publicas.dto.js';
import { ImpactoPublicoService } from './impacto-publico.service.js';

@Controller('public')
@ApiTags('Impacto público')
export class ImpactoPublicoController {
  constructor(private readonly servicio: ImpactoPublicoService) {}

  @Get('campanas')
  @ApiOperation({ summary: 'Listar campañas realizadas con cifras oficiales' })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  @ApiOkResponse({ type: CampanaPublicaDto, isArray: true })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  listarCampanas(
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
  ): Promise<CampanaPublicaDto[]> {
    return this.servicio.listarCampanas(anio);
  }

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener el contador oficial de esterilizaciones' })
  @ApiOkResponse({ type: EstadisticasPublicasDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  obtenerEstadisticas(): Promise<EstadisticasPublicasDto> {
    return this.servicio.obtenerEstadisticas();
  }
}
