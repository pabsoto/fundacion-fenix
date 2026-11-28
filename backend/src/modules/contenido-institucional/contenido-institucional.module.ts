import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { ContenidoInstitucionalAdminService } from './contenido-institucional-admin.service.js';
import { ContenidoInstitucionalPublicoController } from './contenido-institucional-publico.controller.js';
import { ContenidoInstitucionalPublicoService } from './contenido-institucional-publico.service.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ContenidoInstitucional]), StorageModule],
  controllers: [ContenidoInstitucionalPublicoController],
  providers: [
    ContenidoInstitucionalPublicoService,
    ContenidoInstitucionalAdminService,
  ],
  exports: [ContenidoInstitucionalAdminService, TypeOrmModule],
})
export class ContenidoInstitucionalModule {}
