import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { AnimalesAdminService } from './animales-admin.service.js';
import { Animal } from './entities/animal.entity.js';
import { FotosAnimalService } from './fotos-animal.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Animal]), StorageModule],
  providers: [AnimalesAdminService, FotosAnimalService],
  exports: [AnimalesAdminService, FotosAnimalService],
})
export class AnimalesModule {}
