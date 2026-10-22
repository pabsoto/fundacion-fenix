import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Administrador } from './entities/administrador.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Administrador])],
  exports: [TypeOrmModule],
})
export class AdministradoresModule {}
