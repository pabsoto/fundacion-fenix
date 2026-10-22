import { Controller, Get } from '@nestjs/common';
import { CanalesContactoPublicosService } from './canales-contacto-publicos.service.js';
import { CanalContactoPublicoDto } from './dto/canal-contacto-publico.dto.js';

@Controller('public/contactos')
export class CanalesContactoPublicosController {
  constructor(private readonly servicio: CanalesContactoPublicosService) {}

  @Get()
  listar(): Promise<CanalContactoPublicoDto[]> {
    return this.servicio.listarActivos();
  }
}
