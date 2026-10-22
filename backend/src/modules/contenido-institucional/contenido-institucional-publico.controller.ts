import { Controller, Get } from '@nestjs/common';
import { ContenidoInstitucionalPublicoService } from './contenido-institucional-publico.service.js';
import { ContenidoInstitucionalPublicoDto } from './dto/contenido-institucional-publico.dto.js';

@Controller('public/institucional')
export class ContenidoInstitucionalPublicoController {
  constructor(private readonly servicio: ContenidoInstitucionalPublicoService) {}

  @Get()
  listar(): Promise<ContenidoInstitucionalPublicoDto[]> {
    return this.servicio.listarVisibles();
  }
}
