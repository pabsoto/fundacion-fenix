import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseEnumPipe,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';
import { CanalesContactoAdminService } from '../canales-contacto/canales-contacto-admin.service.js';
import {
  ActualizarCanalDto,
  CanalContactoAdminDto,
  TIPOS_CANAL,
} from '../canales-contacto/dto/canal-contacto-admin.dto.js';
import type { TipoCanalContacto } from '../canales-contacto/entities/canal-contacto.entity.js';

/**
 * Edición de los canales de contacto desde el panel (SF-123 / RF-15).
 *
 * Exige sesión administrativa; las escrituras además exigen CSRF y quedan
 * registradas en `auditoria`.
 */
@Controller('admin/canales')
@UseGuards(SesionAdminGuard)
@ApiTags('Canales de contacto')
@ApiUnauthorizedResponse({
  description: 'No existe una sesión válida.',
  type: ErrorResponseDto,
})
@ApiForbiddenResponse({
  description: 'La cuenta está desactivada o el token CSRF es inválido.',
  type: ErrorResponseDto,
})
@ApiServiceUnavailableResponse({
  description: 'PostgreSQL o la auditoría no están disponibles.',
  type: ErrorResponseDto,
})
export class AdminCanalesController {
  constructor(private readonly canales: CanalesContactoAdminService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Listar los canales de contacto (incluye inactivos)',
  })
  @ApiOkResponse({ type: [CanalContactoAdminDto] })
  listar(): Promise<CanalContactoAdminDto[]> {
    return this.canales.listar();
  }

  @Put(':tipo')
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Actualizar un canal de contacto',
    description:
      'Reemplaza URL (`https://` o `mailto:`), textos (es/en) y estado. Registra el cambio en auditoría.',
  })
  @ApiParam({ name: 'tipo', enum: TIPOS_CANAL })
  @ApiBody({ type: ActualizarCanalDto })
  @ApiOkResponse({ type: CanalContactoAdminDto })
  @ApiBadRequestResponse({
    description: 'El tipo o el body no cumplen las validaciones.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'El canal no existe.',
    type: ErrorResponseDto,
  })
  actualizar(
    @Param('tipo', new ParseEnumPipe(TIPOS_CANAL)) tipo: TipoCanalContacto,
    @Body() entrada: ActualizarCanalDto,
    @Req() request: PeticionConSesion,
  ): Promise<CanalContactoAdminDto> {
    return this.canales.actualizar(
      tipo,
      entrada,
      this.administradorId(request),
    );
  }

  private administradorId(request: PeticionConSesion): string {
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para editar los canales',
      );
    }
    return administradorId;
  }
}
