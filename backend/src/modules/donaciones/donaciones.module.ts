import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonacionesPublicasController } from './donaciones-publicas.controller.js';
import { DonacionesPublicasService } from './donaciones-publicas.service.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DatoDonacion])],
  controllers: [DonacionesPublicasController],
  providers: [DonacionesPublicasService],
  exports: [TypeOrmModule],
})
export class DonacionesModule {}
