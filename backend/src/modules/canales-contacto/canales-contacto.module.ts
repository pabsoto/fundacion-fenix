import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanalContacto } from './entities/canal-contacto.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CanalContacto])],
  exports: [TypeOrmModule],
})
export class CanalesContactoModule {}
