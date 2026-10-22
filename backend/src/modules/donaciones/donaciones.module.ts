import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonacionesAdminService } from './donaciones-admin.service.js';
import { DonacionesPublicasController } from './donaciones-publicas.controller.js';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DatoDonacion])],
  controllers: [DonacionesPublicasController],
  providers: [DonacionesAdminService, DonacionesPublicasService],
  exports: [DonacionesAdminService, TypeOrmModule],
})
export class DonacionesModule {}
