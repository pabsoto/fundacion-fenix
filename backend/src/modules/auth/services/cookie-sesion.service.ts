import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  leerConfiguracionSesion,
  type ConfiguracionSesion,
} from '../../../config/sesion.js';

/**
 * Gestión de la cookie de sesión administrativa.
 *
 * La cookie transporta **únicamente** el identificador opaco de la sesión:
 * nunca contiene tokens de Google, datos del administrador ni información
 * sensible. Sus atributos se derivan de la configuración validada al arrancar,
 * de modo que en producción la cookie es siempre `HttpOnly` + `Secure`.
 */
@Injectable()
export class CookieSesionService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Emite la cookie de sesión. La caducidad de la cookie coincide con la
   * caducidad por inactividad: al expirar, el navegador la descarta por sí
   * mismo aunque el servidor aún conserve el registro.
   */
  establecer(response: Response, token: string, expiraEn: Date): void {
    const configuracion = this.leerConfiguracion();
    const vigenciaMs = Math.max(
      0,
      Math.min(
        configuracion.idleTimeoutSegundos * 1_000,
        expiraEn.getTime() - Date.now(),
      ),
    );

    response.cookie(configuracion.cookieName, token, {
      httpOnly: true,
      secure: configuracion.cookieSecure,
      sameSite: configuracion.cookieSameSite,
      path: configuracion.cookiePath,
      ...(configuracion.cookieDomain
        ? { domain: configuracion.cookieDomain }
        : {}),
      maxAge: vigenciaMs,
    });
  }

  /**
   * Elimina la cookie de sesión usando exactamente los mismos atributos con
   * los que se emitió: de lo contrario el navegador conservaría la cookie.
   */
  eliminar(response: Response): void {
    const configuracion = this.leerConfiguracion();

    response.clearCookie(configuracion.cookieName, {
      httpOnly: true,
      secure: configuracion.cookieSecure,
      sameSite: configuracion.cookieSameSite,
      path: configuracion.cookiePath,
      ...(configuracion.cookieDomain
        ? { domain: configuracion.cookieDomain }
        : {}),
    });
  }

  /** Extrae el identificador de sesión de la petición, si lo hay. */
  leerToken(request: Request): string | undefined {
    const configuracion = this.leerConfiguracion();
    const valor = (request.cookies as Record<string, unknown> | undefined)?.[
      configuracion.cookieName
    ];

    return typeof valor === 'string' && valor.length > 0 ? valor : undefined;
  }

  private leerConfiguracion(): ConfiguracionSesion {
    return leerConfiguracionSesion(this.config);
  }
}
