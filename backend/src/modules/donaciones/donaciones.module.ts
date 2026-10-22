import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DatoDonacion])],
  exports: [TypeOrmModule],
})
export class DonacionesModule {}
