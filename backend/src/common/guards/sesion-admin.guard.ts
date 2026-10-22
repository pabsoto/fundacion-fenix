import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AutorizacionAdministradorService } from '../../modules/administradores/services/autorizacion-administrador.service.js';
import { CookieSesionService } from '../../modules/auth/services/cookie-sesion.service.js';
import {
  AlmacenSesionesNoDisponibleError,
  ErrorSesion,
  SesionAdminService,
  type ContextoSesion,
} from '../../modules/auth/services/sesion-admin.service.js';
import type { PeticionConSesion } from '../types/peticion-sesion.js';

/**
 * Guard de sesión administrativa.
 *
 * Comprueba, en este orden:
 *
 * 1. que la petición incluye una cookie de sesión;
 * 2. que la sesión existe, no está revocada y no ha caducado (ni por
 *    inactividad ni por tiempo máximo absoluto);
 * 3. que la cuenta administrativa asociada existe y sigue activa.
 *
 * Distinción de respuestas:
 *
 * - `401 Unauthorized`: no hay sesión, es desconocida, ha caducado, ha sido
 *   revocada o la cuenta ya no existe.
 * - `403 Forbidden`: la sesión es válida pero la cuenta está desactivada.
 * - `503 Service Unavailable`: PostgreSQL no está disponible. La
 *   autorización falla de forma segura: nunca se concede acceso por defecto.
 */
@Injectable()
export class SesionAdminGuard implements CanActivate {
  private readonly logger = new Logger(SesionAdminGuard.name);

  constructor(
    private readonly sesiones: SesionAdminService,
    private readonly cookies: CookieSesionService,
    private readonly autorizacion: AutorizacionAdministradorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<PeticionConSesion>();
    const response = http.getResponse<Response>();

    const token = this.cookies.leerToken(request);
    if (!token) {
      throw new UnauthorizedException(
        'No hay una sesión administrativa activa',
      );
    }

    const validacion = await this.validarSesion(token);

    const administrador = await this.cargarAdministrador(
      validacion.contexto.administradorId,
    );

    if (administrador.estado === 'inexistente') {
      throw new UnauthorizedException(
        'La sesión ya no está asociada a una cuenta administrativa',
      );
    }

    if (administrador.estado === 'inactivo') {
      throw new ForbiddenException('La cuenta administrativa está desactivada');
    }

    request.sesionAdmin = validacion.contexto;
    request.csrfTokenSesion = validacion.contexto.csrfToken;
    request.administradorSesion = {
      id: administrador.administrador.id,
      nombre: administrador.administrador.nombre,
    };

    if (validacion.requiereRotacion) {
      await this.rotarIdentificador(validacion.contexto, response);
    }

    return true;
  }

  private async validarSesion(token: string) {
    try {
      return await this.sesiones.validar(token);
    } catch (error) {
      throw this.traducirError(error);
    }
  }

  private async cargarAdministrador(administradorId: string) {
    try {
      return await this.autorizacion.cargarParaSesion(administradorId);
    } catch (error) {
      this.logger.error(
        'No se pudo comprobar el estado de la cuenta administrativa',
        error instanceof Error ? error.stack : String(error),
      );

      throw new ServiceUnavailableException(
        'No es posible comprobar la autorización administrativa en este momento',
      );
    }
  }

  /**
   * Renueva el identificador de sesión. Si la renovación falla, la petición
   * continúa con el identificador vigente: la sesión sigue siendo válida y
   * no se concede ni se deniega acceso por un fallo puntual de escritura.
   */
  private async rotarIdentificador(
    contexto: ContextoSesion,
    response: Response,
  ): Promise<void> {
    try {
      const token = await this.sesiones.rotar(contexto);

      this.cookies.establecer(response, token, contexto.expiraEn);
    } catch (error) {
      this.logger.warn(
        'No se pudo renovar el identificador de sesión; se mantiene el vigente',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private traducirError(error: unknown): Error {
    if (error instanceof AlmacenSesionesNoDisponibleError) {
      this.logger.error(
        'El almacén de sesiones administrativas no está disponible',
        error.causa instanceof Error ? error.causa.stack : String(error.causa),
      );

      return new ServiceUnavailableException(
        'El servicio de sesiones administrativas no está disponible en este momento',
      );
    }

    if (error instanceof ErrorSesion) {
      return new UnauthorizedException(error.message);
    }

    return new ServiceUnavailableException(
      'No es posible comprobar la sesión administrativa en este momento',
    );
  }
}
