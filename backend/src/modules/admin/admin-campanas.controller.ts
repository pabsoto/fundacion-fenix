import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiPayloadTooLargeResponse,
  ApiUnsupportedMediaTypeResponse,
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
import {
  ArchivoFotoSwaggerDto,
  FotoCampanaDto,
} from '../campanas/dto/foto-campana.dto.js';
import { GuardarCampanaDto } from '../campanas/dto/guardar-campana.dto.js';
import {
  FotosCampanaService,
  TAMANO_MAXIMO_FOTO,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';

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
  constructor(
    private readonly campanas: CampanasAdminService,
    private readonly fotos: FotosCampanaService,
  ) {}

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

  @Post(':id/cerrar')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Cerrar una campaña',
    description:
      'Pasa una campaña publicada a cerrada: sus cifras empiezan a contar en el contador público y deja de editarse. Exige al menos una esterilización. Registra la auditoría en la misma transacción.',
  })
  @ApiOkResponse({ type: CampanaAdminDto })
  @ApiBadRequestResponse({
    description:
      'El identificador no es válido o la campaña no tiene esterilizaciones registradas.',
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
    description: 'La campaña ya está cerrada o todavía no está publicada.',
    type: ErrorResponseDto,
  })
  cerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: PeticionConSesion,
  ): Promise<CampanaAdminDto> {
    return this.campanas.cerrar(id, this.administradorId(request));
  }

  @Post(':id/reabrir')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Reabrir una campaña cerrada',
    description:
      'Devuelve una campaña cerrada a publicada para corregirla. Sus cifras dejan de contar en el contador público hasta que se cierre otra vez. Registra la auditoría en la misma transacción.',
  })
  @ApiOkResponse({ type: CampanaAdminDto })
  @ApiBadRequestResponse({
    description: 'El identificador no es un UUID.',
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
    description: 'La campaña no está cerrada o es la campaña histórica.',
    type: ErrorResponseDto,
  })
  reabrir(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: PeticionConSesion,
  ): Promise<CampanaAdminDto> {
    return this.campanas.reabrir(id, this.administradorId(request));
  }

  @Post(':id/fotos')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_FOTO } }),
  )
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir una fotografía de campaña',
    description:
      'Acepta JPG, PNG o WebP de hasta 5 MB, validando el contenido real del archivo.',
  })
  @ApiBody({ type: ArchivoFotoSwaggerDto })
  @ApiCreatedResponse({ type: FotoCampanaDto })
  @ApiBadRequestResponse({
    description: 'Falta el archivo o el identificador no es válido.',
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
  ): Promise<FotoCampanaDto> {
    return this.fotos.subir(id, archivo, this.administradorId(request));
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
