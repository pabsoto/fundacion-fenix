import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from './entities/auditoria.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Auditoria])],
  exports: [TypeOrmModule],
})
export class AuditoriaModule {}
