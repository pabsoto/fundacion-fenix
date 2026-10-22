import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContenidoInstitucionalPublicoController } from './contenido-institucional-publico.controller.js';
import { ContenidoInstitucionalPublicoService } from './contenido-institucional-publico.service.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ContenidoInstitucional])],
  controllers: [ContenidoInstitucionalPublicoController],
  providers: [ContenidoInstitucionalPublicoService],
  exports: [TypeOrmModule],
})
export class ContenidoInstitucionalModule {}
