import {
  Body,
  Controller,
  Get,
  Header,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';
import { DonacionesAdminService } from '../donaciones/donaciones-admin.service.js';
import {
  RespuestaDonacionAdminDto,
  ResultadoGuardarDonacionDto,
} from '../donaciones/dto/dato-donacion-admin.dto.js';
import { GuardarDatoDonacionDto } from '../donaciones/dto/guardar-dato-donacion.dto.js';

/**
 * Respuesta del endpoint privado de comprobación.
 *
 * No expone información de Supabase, de la base de datos ni de la sesión: sólo
 * confirma que hay un administrador autenticado y autorizado.
 */
class AdministradorComprobacionDto {
  @ApiProperty({
    format: 'uuid',
    example: '8e50816a-2d40-4b10-a4bf-103c31dbd9a8',
  })
  readonly id: string;

  @ApiProperty({ example: 'Administradora FÉNIX' })
  readonly nombre: string;
}

export class ComprobacionAdminDto {
  @ApiProperty({ example: 'ok' })
  readonly status: 'ok';

  @ApiProperty({ type: () => AdministradorComprobacionDto })
  readonly administrador: AdministradorComprobacionDto;

  @ApiProperty({ format: 'date-time', example: '2026-10-22T15:30:00.000Z' })
  readonly timestamp: string;
}

/**
 * Endpoints privados del panel administrativo.
 *
 * Todas las rutas del controlador están protegidas por `SesionAdminGuard`:
 * sin una sesión administrativa válida y autorizada la respuesta es `401`
 * (o `403` si la cuenta está desactivada, o `503` si PostgreSQL no está
 * disponible).
 */
@Controller('admin')
@UseGuards(SesionAdminGuard)
export class AdminController {
  constructor(private readonly donaciones: DonacionesAdminService) {}

  @Get('health')
  @Header('Cache-Control', 'no-store')
  @ApiTags('Administración')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Comprobar el acceso administrativo',
    description:
      'Confirma que la sesión pertenece a un administrador existente y activo.',
  })
  @ApiOkResponse({
    description: 'Acceso administrativo autorizado.',
    type: ComprobacionAdminDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No existe una sesión válida.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta administrativa está desactivada.',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'No se puede comprobar la sesión o autorización.',
    type: ErrorResponseDto,
  })
  comprobar(@Req() request: PeticionConSesion): ComprobacionAdminDto {
    const administrador = request.administradorSesion;

    return {
      status: 'ok',
      administrador: {
        id: administrador?.id ?? '',
        nombre: administrador?.nombre ?? '',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('donaciones')
  @Header('Cache-Control', 'no-store')
  @ApiTags('Donaciones administrativas')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Consultar la configuración activa de donaciones',
    description:
      'Devuelve la configuración editable activa o { donacion: null } para permitir registrar la primera. No expone responsables ni metadatos internos.',
  })
  @ApiOkResponse({
    description: 'Configuración activa o ausencia de configuración.',
    type: RespuestaDonacionAdminDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No existe una sesión válida.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta administrativa está desactivada.',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description:
      'PostgreSQL no está disponible o los datos son inconsistentes.',
    type: ErrorResponseDto,
  })
  obtenerDonacion(): Promise<RespuestaDonacionAdminDto> {
    return this.donaciones.obtenerActiva();
  }

  @Put('donaciones')
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiTags('Donaciones administrativas')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Crear o actualizar la configuración de donaciones',
    description:
      'Crea la primera configuración activa o actualiza la existente en una transacción atómica con auditoría. Conserva los campos QR.',
  })
  @ApiBody({
    type: GuardarDatoDonacionDto,
    description:
      'Datos oficiales editables. No acepta IDs, estado ni campos QR.',
  })
  @ApiOkResponse({
    description: 'Configuración creada o actualizada.',
    type: ResultadoGuardarDonacionDto,
  })
  @ApiBadRequestResponse({
    description:
      'El body no cumple las validaciones o contiene campos no permitidos.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No existe una sesión válida.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'La cuenta está desactivada o el token CSRF es inválido.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Existe más de una configuración activa o se produjo un conflicto concurrente.',
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Falló PostgreSQL o la escritura atómica de auditoría.',
    type: ErrorResponseDto,
  })
  guardarDonacion(
    @Body() entrada: GuardarDatoDonacionDto,
    @Req() request: PeticionConSesion,
  ): Promise<ResultadoGuardarDonacionDto> {
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para guardar la configuración',
      );
    }

    return this.donaciones.guardar(entrada, administradorId);
  }
}
