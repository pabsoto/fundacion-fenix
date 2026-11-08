import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampanasAdminService } from './campanas-admin.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { Campana } from './entities/campana.entity.js';
import { FotoCampana } from './entities/foto-campana.entity.js';
import { FotosCampanaService } from './fotos-campana.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Campana, FotoCampana]), StorageModule],
  providers: [CampanasAdminService, FotosCampanaService],
  exports: [CampanasAdminService, FotosCampanaService],
})
export class CampanasModule {}
