import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiSecurity,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';
import {
  TAMANO_MAXIMO_FOTO,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';
import { ArchivoFotoSwaggerDto } from '../campanas/dto/foto-campana.dto.js';
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

  @Post(':clave/imagen')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_FOTO } }),
  )
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir o reemplazar la imagen de una sección',
    description:
      'Acepta JPG, PNG o WebP de hasta 5 MB, validando el contenido real del archivo. La ruta queda en contenido/{clave}/{uuid}.{ext}.',
  })
  @ApiBody({ type: ArchivoFotoSwaggerDto })
  @ApiCreatedResponse({ type: ContenidoInstitucionalAdminDto })
  @ApiBadRequestResponse({
    description: 'Falta el archivo.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La sección no existe.',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'La imagen supera 5 MB.',
    type: ErrorResponseDto,
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'El archivo no es un JPG, PNG o WebP válido.',
    type: ErrorResponseDto,
  })
  reemplazarImagen(
    @Param('clave') clave: string,
    @UploadedFile() archivo: ArchivoFotoCargado | undefined,
    @Req() request: PeticionConSesion,
  ): Promise<ContenidoInstitucionalAdminDto> {
    return this.contenido.reemplazarImagen(
      clave,
      archivo,
      this.administradorId(request),
    );
  }
}
