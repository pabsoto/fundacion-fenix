import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ContenidoInstitucional])],
  exports: [TypeOrmModule],
})
export class ContenidoInstitucionalModule {}
