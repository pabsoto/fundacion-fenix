import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalesAdminService } from './animales-admin.service.js';
import { Animal } from './entities/animal.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Animal])],
  providers: [AnimalesAdminService],
  exports: [AnimalesAdminService],
})
export class AnimalesModule {}
