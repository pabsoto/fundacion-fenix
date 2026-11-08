import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampanasAdminService } from './campanas-admin.service.js';
import { Campana } from './entities/campana.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Campana])],
  providers: [CampanasAdminService],
  exports: [CampanasAdminService],
})
export class CampanasModule {}
