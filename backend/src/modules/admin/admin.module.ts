import { Module } from '@nestjs/common';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import { AdministradoresModule } from '../administradores/administradores.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminController } from './admin.controller.js';

/**
 * Módulo del panel administrativo.
 *
 * Reutiliza el módulo de autenticación (sesiones y cookies) y el módulo de
 * administradores (autorización) de la Etapa 4: no se duplica ninguna
 * estrategia de autenticación.
 */
@Module({
  imports: [AuthModule, AdministradoresModule],
  controllers: [AdminController],
  providers: [SesionAdminGuard],
})
export class AdminModule {}
