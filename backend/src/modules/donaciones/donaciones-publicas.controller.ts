import { Controller, Get } from '@nestjs/common';
import { RespuestaDonacionPublicaDto } from './dto/dato-donacion-publico.dto.js';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';

@Controller('public/donaciones')
export class DonacionesPublicasController {
  constructor(private readonly servicio: DonacionesPublicasService) {}

  @Get()
  async obtener(): Promise<RespuestaDonacionPublicaDto> {
    return { donacion: await this.servicio.obtenerActiva() };
  }
}
