import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import { AdministradoresModule } from '../administradores/administradores.module.js';
import { AuthController } from './auth.controller.js';
import { SesionAdmin } from './entities/sesion-admin.entity.js';
import {
  PROVEEDOR_CLAVES_GOOGLE,
  ProveedorClavesGoogleRemoto,
} from './oauth/google-jwks.provider.js';
import { ClienteOAuthGoogleService } from './oauth/google-oauth-client.service.js';
import { VerificadorIdTokenGoogleService } from './oauth/google-token-verifier.service.js';
import { AlmacenTransaccionesOAuth } from './oauth/oauth-transaction.store.js';
import { CookieSesionService } from './services/cookie-sesion.service.js';
import { GoogleAuthService } from './services/google-auth.service.js';
import { SesionAdminService } from './services/sesion-admin.service.js';

@Module({
  imports: [AdministradoresModule, TypeOrmModule.forFeature([SesionAdmin])],
  controllers: [AuthController],
  providers: [
    GoogleAuthService,
    ClienteOAuthGoogleService,
    VerificadorIdTokenGoogleService,
    AlmacenTransaccionesOAuth,
    SesionAdminService,
    CookieSesionService,
    SesionAdminGuard,
    CsrfGuard,
    {
      provide: PROVEEDOR_CLAVES_GOOGLE,
      useClass: ProveedorClavesGoogleRemoto,
    },
  ],
  exports: [
    GoogleAuthService,
    AlmacenTransaccionesOAuth,
    SesionAdminService,
    CookieSesionService,
    SesionAdminGuard,
    CsrfGuard,
  ],
})
export class AuthModule {}
