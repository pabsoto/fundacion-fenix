import { Module } from '@nestjs/common';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { AdministradoresModule } from '../administradores/administradores.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CampanasModule } from '../campanas/campanas.module.js';
import { DonacionesModule } from '../donaciones/donaciones.module.js';
import { AdminCampanasController } from './admin-campanas.controller.js';
import { AdminController } from './admin.controller.js';

/**
 * Módulo del panel administrativo.
 *
 * Reutiliza el módulo de autenticación (sesiones y cookies) y el módulo de
 * administradores (autorización) de la Etapa 4: no se duplica ninguna
 * estrategia de autenticación.
 */
@Module({
  imports: [
    AuthModule,
    AdministradoresModule,
    DonacionesModule,
    CampanasModule,
  ],
  controllers: [AdminController, AdminCampanasController],
  providers: [SesionAdminGuard, CsrfGuard],
})
export class AdminModule {}
