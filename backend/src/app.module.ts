import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AdministradoresModule } from './modules/administradores/administradores.module.js';
import { AuditoriaModule } from './modules/auditoria/auditoria.module.js';
import { CanalesContactoModule } from './modules/canales-contacto/canales-contacto.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ContenidoInstitucionalModule } from './modules/contenido-institucional/contenido-institucional.module.js';
import { DonacionesModule } from './modules/donaciones/donaciones.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { ImpactoPublicoModule } from './modules/impacto-publico/impacto-publico.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    AdminModule,
    AdministradoresModule,
    ContenidoInstitucionalModule,
    DonacionesModule,
    AuditoriaModule,
    CanalesContactoModule,
    StorageModule,
    ImpactoPublicoModule,
  ],
})
export class AppModule {}
