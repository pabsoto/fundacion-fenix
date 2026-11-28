import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { Historia } from './entities/historia.entity.js';
import { FotosHistoriaService } from './fotos-historia.service.js';
import { HistoriasAdminService } from './historias-admin.service.js';
import { HistoriasPublicasController } from './historias-publicas.controller.js';
import { HistoriasPublicasService } from './historias-publicas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Historia]), StorageModule],
  controllers: [HistoriasPublicasController],
  providers: [
    HistoriasAdminService,
    FotosHistoriaService,
    HistoriasPublicasService,
  ],
  exports: [HistoriasAdminService, FotosHistoriaService],
})
export class HistoriasModule {}
