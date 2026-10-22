import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanalesContactoPublicosController } from './canales-contacto-publicos.controller.js';
import { CanalesContactoPublicosService } from './canales-contacto-publicos.service.js';
import { CanalContacto } from './entities/canal-contacto.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CanalContacto])],
  controllers: [CanalesContactoPublicosController],
  providers: [CanalesContactoPublicosService],
  exports: [TypeOrmModule],
})
export class CanalesContactoModule {}
