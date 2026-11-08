import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CampanasAdminService } from '../campanas/campanas-admin.service.js';
import { CampanaAdminDto } from '../campanas/dto/campana-admin.dto.js';
import {
  CifrasPeriodoDto,
  ConsultaCifrasDto,
} from '../campanas/dto/consulta-cifras.dto.js';
import { GuardarCampanaDto } from '../campanas/dto/guardar-campana.dto.js';

/**
 * Gestión de campañas desde el panel (SF-6 / RF-07).
 *
 * Todas las rutas exigen una sesión administrativa activa; las escrituras
 * además exigen el token CSRF y quedan registradas en `auditoria`.
 */
@Controller('admin/campanas')
@UseGuards(SesionAdminGuard)
@ApiTags('Campañas administrativas')
@ApiUnauthorizedResponse({
  description: 'No existe una sesión válida.',
  type: ErrorResponseDto,
})
@ApiServiceUnavailableResponse({
  description: 'PostgreSQL o la auditoría no están disponibles.',
  type: ErrorResponseDto,
})
export class AdminCampanasController {
  constructor(private readonly campanas: CampanasAdminService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Listar todas las campañas',
    description: 'Incluye borradores. Ordena por fecha descendente.',
  })
  @ApiOkResponse({ type: CampanaAdminDto, isArray: true })
  @ApiForbiddenResponse({
    description: 'La cuenta administrativa está desactivada.',
    type: ErrorResponseDto,
  })
  listar(): Promise<CampanaAdminDto[]> {
    return this.campanas.listar();
  }

  @Get('cifras')
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Consultar cifras por año y mes',
    description:
      'Suma las cifras de las campañas con fecha dentro del periodo. Sin `mes` abarca todo el año. Incluye borradores salvo que se filtre por `estado`.',
  })
  @ApiOkResponse({ type: CifrasPeriodoDto })
  @ApiBadRequestResponse({
    description: 'El año, el mes o el estado no son válidos.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta administrativa está desactivada.',
    type: ErrorResponseDto,
  })
  cifras(@Query() consulta: ConsultaCifrasDto): Promise<CifrasPeriodoDto> {
    return this.campanas.consultarCifras(consulta);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({ summary: 'Obtener una campaña para editarla' })
  @ApiOkResponse({ type: CampanaAdminDto })
  @ApiBadRequestResponse({
    description: 'El identificador no es un UUID.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta administrativa está desactivada.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La campaña no existe.',
    type: ErrorResponseDto,
  })
  obtener(@Param('id', ParseUUIDPipe) id: string): Promise<CampanaAdminDto> {
    return this.campanas.obtener(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Crear una campaña',
    description:
      'Crea la campaña como borrador o publicada y registra la auditoría en la misma transacción. Para publicar se exigen lugar y fecha.',
  })
  @ApiBody({ type: GuardarCampanaDto })
  @ApiCreatedResponse({ type: CampanaAdminDto })
  @ApiBadRequestResponse({
    description: 'El body no cumple las validaciones.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta está desactivada o el token CSRF es inválido.',
    type: ErrorResponseDto,
  })
  crear(
    @Body() entrada: GuardarCampanaDto,
    @Req() request: PeticionConSesion,
  ): Promise<CampanaAdminDto> {
    return this.campanas.crear(entrada, this.administradorId(request));
  }

  @Put(':id')
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Actualizar una campaña',
    description:
      'Reemplaza título, descripción, lugar, fecha y estado. Conserva cifras y fotos. Registra la auditoría en la misma transacción.',
  })
  @ApiBody({ type: GuardarCampanaDto })
  @ApiOkResponse({ type: CampanaAdminDto })
  @ApiBadRequestResponse({
    description: 'El body o el identificador no son válidos.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta está desactivada o el token CSRF es inválido.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La campaña no existe.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La campaña está cerrada y no se edita desde este formulario.',
    type: ErrorResponseDto,
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() entrada: GuardarCampanaDto,
    @Req() request: PeticionConSesion,
  ): Promise<CampanaAdminDto> {
    return this.campanas.actualizar(id, entrada, this.administradorId(request));
  }

  private administradorId(request: PeticionConSesion): string {
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para gestionar campañas',
      );
    }
    return administradorId;
  }
}
