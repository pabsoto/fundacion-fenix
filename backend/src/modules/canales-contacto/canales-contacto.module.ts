import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanalesContactoAdminService } from './canales-contacto-admin.service.js';
import { CanalesContactoPublicosController } from './canales-contacto-publicos.controller.js';
import { CanalesContactoPublicosService } from './canales-contacto-publicos.service.js';
import { CanalContacto } from './entities/canal-contacto.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CanalContacto])],
  controllers: [CanalesContactoPublicosController],
  providers: [CanalesContactoPublicosService, CanalesContactoAdminService],
  exports: [CanalesContactoAdminService, TypeOrmModule],
})
export class CanalesContactoModule {}
