import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import { ResumenAdminDto } from './dto/resumen-admin.dto.js';
import { ResumenAdminService } from './resumen-admin.service.js';

/** Cifras de la pantalla de inicio del panel. Solo lectura. */
@Controller('admin/resumen')
@UseGuards(SesionAdminGuard)
@ApiTags('Resumen administrativo')
@ApiUnauthorizedResponse({
  description: 'No existe una sesión válida.',
  type: ErrorResponseDto,
})
export class AdminResumenController {
  constructor(private readonly resumen: ResumenAdminService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Resumen del panel',
    description:
      'Esterilizaciones, animales en la fundación, adopciones del año, días promedio hasta adoptar, serie de los últimos doce meses y animales que llevan más tiempo esperando.',
  })
  @ApiOkResponse({ type: ResumenAdminDto })
  @ApiForbiddenResponse({
    description: 'La cuenta administrativa está desactivada.',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL no está disponible.',
    type: ErrorResponseDto,
  })
  obtener(): Promise<ResumenAdminDto> {
    return this.resumen.obtener();
  }
}
