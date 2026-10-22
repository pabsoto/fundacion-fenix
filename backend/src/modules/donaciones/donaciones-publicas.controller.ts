import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { RespuestaDonacionPublicaDto } from './dto/dato-donacion-publico.dto.js';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';

@Controller('public/donaciones')
@ApiTags('Donaciones públicas')
export class DonacionesPublicasController {
  constructor(private readonly servicio: DonacionesPublicasService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar datos oficiales de donación',
    description:
      'Devuelve la única configuración activa o { donacion: null } cuando todavía no existe. No procesa pagos.',
  })
  @ApiOkResponse({
    description: 'Configuración pública activa o ausencia coherente de datos.',
    type: RespuestaDonacionPublicaDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'PostgreSQL no está disponible o hay más de una configuración activa.',
    type: ErrorResponseDto,
  })
  async obtener(): Promise<RespuestaDonacionPublicaDto> {
    return { donacion: await this.servicio.obtenerActiva() };
  }
}
