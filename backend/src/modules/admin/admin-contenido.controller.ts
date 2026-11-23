import {
  Body,
  Controller,
  Get,
  Header,
  Param,
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
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';
import { ContenidoInstitucionalAdminService } from '../contenido-institucional/contenido-institucional-admin.service.js';
import {
  ActualizarContenidoDto,
  ContenidoInstitucionalAdminDto,
} from '../contenido-institucional/dto/contenido-institucional-admin.dto.js';

/**
 * Edición del contenido institucional desde el panel (SF-123 / RF-15).
 *
 * Exige sesión administrativa; las escrituras además exigen CSRF y quedan
 * registradas en `auditoria`.
 */
@Controller('admin/contenido')
@UseGuards(SesionAdminGuard)
@ApiTags('Contenido del sitio')
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
export class AdminContenidoController {
  constructor(private readonly contenido: ContenidoInstitucionalAdminService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Listar las secciones de contenido (incluye las ocultas)',
  })
  @ApiOkResponse({ type: [ContenidoInstitucionalAdminDto] })
  listar(): Promise<ContenidoInstitucionalAdminDto[]> {
    return this.contenido.listar();
  }

  @Put(':clave')
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Actualizar una sección de contenido',
    description:
      'Reemplaza título, texto (es/en) y visibilidad. El texto en español es obligatorio. Registra el cambio en auditoría.',
  })
  @ApiBody({ type: ActualizarContenidoDto })
  @ApiOkResponse({ type: ContenidoInstitucionalAdminDto })
  @ApiBadRequestResponse({
    description: 'El body no cumple las validaciones.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La sección no existe.',
    type: ErrorResponseDto,
  })
  actualizar(
    @Param('clave') clave: string,
    @Body() entrada: ActualizarContenidoDto,
    @Req() request: PeticionConSesion,
  ): Promise<ContenidoInstitucionalAdminDto> {
    return this.contenido.actualizar(
      clave,
      entrada,
      this.administradorId(request),
    );
  }

  private administradorId(request: PeticionConSesion): string {
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para editar el contenido',
      );
    }
    return administradorId;
  }
}
