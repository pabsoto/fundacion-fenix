import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AnimalesAdminService } from '../animales/animales-admin.service.js';
import { AnimalDto } from '../animales/dto/animal.dto.js';
import { ConsultaAnimalesDto } from '../animales/dto/consulta-animales.dto.js';
import { FotoAnimalDto } from '../animales/dto/foto-animal.dto.js';
import { RegistrarAnimalDto } from '../animales/dto/registrar-animal.dto.js';
import {
  FotosAnimalService,
  type TipoFotoAnimal,
} from '../animales/fotos-animal.service.js';
import { ArchivoFotoSwaggerDto } from '../campanas/dto/foto-campana.dto.js';
import {
  TAMANO_MAXIMO_FOTO,
  type ArchivoFotoCargado,
} from '../campanas/fotos-campana.service.js';

const TIPOS_FOTO = ['animal', 'entrega'];

@Controller('admin/animales')
@UseGuards(SesionAdminGuard)
@ApiTags('Animales administrativos')
@ApiUnauthorizedResponse({
  description: 'No existe una sesión válida.',
  type: ErrorResponseDto,
})
@ApiForbiddenResponse({
  description: 'La cuenta está desactivada o el token CSRF es inválido.',
  type: ErrorResponseDto,
})
@ApiServiceUnavailableResponse({
  description: 'PostgreSQL no está disponible.',
  type: ErrorResponseDto,
})
export class AdminAnimalesController {
  constructor(
    private readonly animales: AnimalesAdminService,
    private readonly fotosAnimal: FotosAnimalService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Listar animales',
    description:
      'Incluye adoptados y no adoptados. Use `adoptado` para filtrar.',
  })
  @ApiOkResponse({ type: AnimalDto, isArray: true })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  listar(@Query() consulta: ConsultaAnimalesDto): Promise<AnimalDto[]> {
    return this.animales.listar(consulta.adoptado);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({ summary: 'Obtener un animal' })
  @ApiOkResponse({ type: AnimalDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  obtener(@Param('id', ParseUUIDPipe) id: string): Promise<AnimalDto> {
    return this.animales.obtener(id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiOperation({
    summary: 'Registrar un animal',
    description:
      'Registra un animal adoptado o no adoptado. Si `adoptado` es true se exigen los datos del adoptante y la fecha de adopción.',
  })
  @ApiBody({ type: RegistrarAnimalDto })
  @ApiCreatedResponse({ type: AnimalDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  registrar(
    @Body() entrada: RegistrarAnimalDto,
    @Req() request: PeticionConSesion,
  ): Promise<AnimalDto> {
    return this.animales.registrar(entrada, this.administradorId(request));
  }

  @Post(':id/fotos/:tipo')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO_FOTO } }),
  )
  @Header('Cache-Control', 'no-store')
  @ApiSecurity({ cookieAuth: [], csrfToken: [] })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir la foto de un animal o de su entrega',
    description:
      '`tipo` es `animal` o `entrega`. Acepta JPG, PNG o WebP de hasta 5 MB y la guarda en un bucket privado. Reemplaza la foto anterior. La foto de entrega exige un animal adoptado.',
  })
  @ApiBody({ type: ArchivoFotoSwaggerDto })
  @ApiCreatedResponse({ type: FotoAnimalDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'La foto de entrega exige un animal adoptado.',
    type: ErrorResponseDto,
  })
  @ApiPayloadTooLargeResponse({ type: ErrorResponseDto })
  @ApiUnsupportedMediaTypeResponse({ type: ErrorResponseDto })
  subirFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tipo', new ParseEnumPipe(TIPOS_FOTO)) tipo: TipoFotoAnimal,
    @UploadedFile() archivo: ArchivoFotoCargado | undefined,
    @Req() request: PeticionConSesion,
  ): Promise<FotoAnimalDto> {
    return this.fotosAnimal.subir(
      tipo,
      id,
      archivo,
      this.administradorId(request),
    );
  }

  @Get(':id/fotos/:tipo')
  @Header('Cache-Control', 'no-store')
  @ApiSecurity('cookieAuth')
  @ApiOperation({
    summary: 'Obtener un acceso temporal a la foto de un animal o su entrega',
    description: 'Devuelve una URL firmada que caduca en pocos minutos.',
  })
  @ApiOkResponse({ type: FotoAnimalDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  obtenerFoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tipo', new ParseEnumPipe(TIPOS_FOTO)) tipo: TipoFotoAnimal,
  ): Promise<FotoAnimalDto> {
    return this.fotosAnimal.obtener(tipo, id);
  }

  private administradorId(request: PeticionConSesion): string {
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para gestionar animales',
      );
    }
    return administradorId;
  }
}
