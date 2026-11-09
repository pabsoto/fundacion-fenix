import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
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
import { AnimalesAdminService } from '../animales/animales-admin.service.js';
import { AnimalDto } from '../animales/dto/animal.dto.js';
import { ConsultaAnimalesDto } from '../animales/dto/consulta-animales.dto.js';
import { RegistrarAnimalDto } from '../animales/dto/registrar-animal.dto.js';

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
  constructor(private readonly animales: AnimalesAdminService) {}

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
    const administradorId = request.administradorSesion?.id;
    if (!administradorId) {
      throw new UnauthorizedException(
        'No hay un administrador autenticado para registrar animales',
      );
    }
    return this.animales.registrar(entrada, administradorId);
  }
}
