import { Module } from '@nestjs/common';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { AdministradoresModule } from '../administradores/administradores.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AnimalesModule } from '../animales/animales.module.js';
import { CampanasModule } from '../campanas/campanas.module.js';
import { CanalesContactoModule } from '../canales-contacto/canales-contacto.module.js';
import { ContenidoInstitucionalModule } from '../contenido-institucional/contenido-institucional.module.js';
import { DonacionesModule } from '../donaciones/donaciones.module.js';
import { HistoriasModule } from '../historias/historias.module.js';
import { AdminAnimalesController } from './admin-animales.controller.js';
import { AdminCanalesController } from './admin-canales.controller.js';
import { AdminContenidoController } from './admin-contenido.controller.js';
import { AdminCampanasController } from './admin-campanas.controller.js';
import { AdminHistoriasController } from './admin-historias.controller.js';
import { AdminResumenController } from './admin-resumen.controller.js';
import { AdminController } from './admin.controller.js';
import { ResumenAdminService } from './resumen-admin.service.js';

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
    AnimalesModule,
    ContenidoInstitucionalModule,
    CanalesContactoModule,
    HistoriasModule,
  ],
  controllers: [
    AdminController,
    AdminCampanasController,
    AdminAnimalesController,
    AdminResumenController,
    AdminContenidoController,
    AdminCanalesController,
    AdminHistoriasController,
  ],
  providers: [SesionAdminGuard, CsrfGuard, ResumenAdminService],
})
export class AdminModule {}
