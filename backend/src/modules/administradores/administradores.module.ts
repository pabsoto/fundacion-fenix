import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Administrador } from './entities/administrador.entity.js';
import { AutorizacionAdministradorService } from './services/autorizacion-administrador.service.js';
import { VinculacionGoogleService } from './services/vinculacion-google.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Administrador])],
  providers: [AutorizacionAdministradorService, VinculacionGoogleService],
  exports: [
    TypeOrmModule,
    AutorizacionAdministradorService,
    VinculacionGoogleService,
  ],
})
export class AdministradoresModule {}
