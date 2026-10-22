import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonacionesAdminService } from './donaciones-admin.service.js';
import { DonacionesPublicasController } from './donaciones-publicas.controller.js';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';
import { StorageModule } from '../storage/storage.module.js';
import { DonacionesQrService } from './donaciones-qr.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DatoDonacion]), StorageModule],
  controllers: [DonacionesPublicasController],
  providers: [
    DonacionesAdminService,
    DonacionesPublicasService,
    DonacionesQrService,
  ],
  exports: [DonacionesAdminService, DonacionesQrService, TypeOrmModule],
})
export class DonacionesModule {}
