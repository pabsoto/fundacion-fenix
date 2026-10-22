import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';

/**
 * Respuesta del endpoint privado de comprobación.
 *
 * No expone información de Supabase, de la base de datos ni de la sesión: sólo
 * confirma que hay un administrador autenticado y autorizado.
 */
export interface ComprobacionAdminDto {
  readonly status: 'ok';
  readonly administrador: {
    readonly id: string;
    readonly nombre: string;
  };
  readonly timestamp: string;
}

/**
 * Endpoints privados del panel administrativo.
 *
 * Todas las rutas del controlador están protegidas por `SesionAdminGuard`:
 * sin una sesión administrativa válida y autorizada la respuesta es `401`
 * (o `403` si la cuenta está desactivada, o `503` si PostgreSQL no está
 * disponible).
 */
@Controller('admin')
@UseGuards(SesionAdminGuard)
export class AdminController {
  @Get('health')
  @Header('Cache-Control', 'no-store')
  comprobar(@Req() request: PeticionConSesion): ComprobacionAdminDto {
    const administrador = request.administradorSesion;

    return {
      status: 'ok',
      administrador: {
        id: administrador?.id ?? '',
        nombre: administrador?.nombre ?? '',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
