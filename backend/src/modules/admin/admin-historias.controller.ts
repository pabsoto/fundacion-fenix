import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';
import { ArchivoFotoSwaggerDto } from '../campanas/dto/foto-campana.dto.js';
import {
  TAMANO_MAXIMO_FOTO,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';
import {
  ActualizarHistoriaDto,
  GuardarHistoriaDto,
} from '../historias/dto/guardar-historia.dto.js';
import { HistoriaAdminDto } from '../historias/dto/historia-admin.dto.js';
import { ReordenarHistoriasDto } from '../historias/dto/reordenar-historias.dto.js';
import { FotosHistoriaService } from '../historias/fotos-historia.service.js';
import { HistoriasAdminService } from '../historias/historias-admin.service.js';

/**
 * Gestión de historias destacadas desde el panel (SF-113 / RF-15).
 *
 * Exige sesión administrativa; las escrituras además exigen CSRF y quedan
 * registradas en `auditoria`.
 */
@Controller('admin/historias')
@UseGuards(SesionAdminGuard)
@ApiTags('Historias destacadas')
@ApiUnauthorizedResponse({
  description: 'No existe una sesión válida.',
  type: ErrorResponseDto,
})
@ApiForbiddenResponse({
  description: 'La cuenta está desactivada o el token CSRF es inválido.',
  type: ErrorResponseDto,
})
@ApiServiceUnavailableResponse({
  description: 'PostgreSQL, la auditoría o Storage no están disponibles.',
  type: ErrorResponseDto,
})
export class AdminHistoriasController {
  constructor(
    private readonly historias: HistoriasAdminService,
    private readonly fotos: FotosHistoriaService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Listar las historias (incluye las ocultas)',
    description: 'Ordenadas por `orden`. No incluye las eliminadas.',
  })
  @ApiOkResponse({ type: [HistoriaAdminDto] })
  listar(): Promise<HistoriaAdminDto[]> {
    return this.historias.listar();
  }

  @Post()
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Crear una historia',
    description: 'Queda oculta, sin foto y al final del orden.',
  })
  @ApiBody({ type: GuardarHistoriaDto })
  @ApiCreatedResponse({ type: HistoriaAdminDto })
  @ApiBadRequestResponse({
    description: 'El body no cumple las validaciones.',
    type: ErrorResponseDto,
  })
  crear(
    @Body() entrada: GuardarHistoriaDto,
    @Req() request: PeticionConSesion,
  ): Promise<HistoriaAdminDto> {
    return this.historias.crear(entrada, this.administradorId(request));
  }

  // Debe declararse antes de `:id`, o "orden" se leería como un id.
  @Put('orden')
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Reordenar las historias',
    description:
      'Recibe los identificadores de todas las historias no eliminadas en el orden deseado.',
  })
  @ApiBody({ type: ReordenarHistoriasDto })
  @ApiOkResponse({ type: [HistoriaAdminDto] })
  @ApiBadRequestResponse({
    description: 'La lista no incluye exactamente las historias existentes.',
    type: ErrorResponseDto,
  })
  reordenar(
    @Body() entrada: ReordenarHistoriasDto,
    @Req() request: PeticionConSesion,
  ): Promise<HistoriaAdminDto[]> {
    return this.historias.reordenar(entrada.ids, this.administradorId(request));
  }

  @Put(':id')
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Editar, publicar u ocultar una historia',
    description:
      'Reemplaza todos los campos editables. Para publicarla (`visible: true`) debe tener foto.',
  })
  @ApiBody({ type: ActualizarHistoriaDto })
  @ApiOkResponse({ type: HistoriaAdminDto })
  @ApiBadRequestResponse({
    description: 'El body o el identificador no son válidos.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La historia no existe.',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'La historia no tiene foto y no se puede publicar.',
    type: ErrorResponseDto,
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() entrada: ActualizarHistoriaDto,
    @Req() request: PeticionConSesion,
  ): Promise<HistoriaAdminDto> {
    return this.historias.actualizar(
      id,
      entrada,
      this.administradorId(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Eliminar una historia',
    description:
      'Borrado lógico: conserva la fila y borra la fotografía de Storage.',
  })
  @ApiNoContentResponse({ description: 'La historia se eliminó.' })
  @ApiBadRequestResponse({
    description: 'El identificador no es un UUID.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La historia no existe.',
    type: ErrorResponseDto,
  })
  eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: PeticionConSesion,
  ): Promise<void> {
    return this.historias.eliminar(id, this.administradorId(request));
  }

  @Post(':id/foto')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_FOTO } }),
  )
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir o reemplazar la fotografía de una historia',
    description:
      'Acepta JPG, PNG o WebP de hasta 5 MB, validando el contenido real del archivo. Guarda el ancho y el alto visibles.',
  })
  @ApiBody({ type: ArchivoFotoSwaggerDto })
  @ApiCreatedResponse({ type: HistoriaAdminDto })
  @ApiBadRequestResponse({
    description: 'Falta el archivo o el identificador no es válido.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'La historia no existe.',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'La fotografía supera 5 MB.',
    type: ErrorResponseDto,
  })
  @ApiUnsupportedMediaTypeResponse({
    description: 'El archivo no es un JPG, PNG o WebP válido.',
    type: ErrorResponseDto,
  })
  subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo: ArchivoFotoCargado | undefined,
    @Req() request: PeticionConSesion,
  ): Promise<HistoriaAdminDto> {
    return this.fotos.subir(id, archivo, this.administradorId(request));
  }

  private administradorId(request: PeticionConSesion): string {
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para gestionar historias',
      );
    }
    return administradorId;
  }
}
