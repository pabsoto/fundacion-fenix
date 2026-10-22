import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CsrfGuard } from '../../common/guards/csrf.guard.js';
import { SesionAdminGuard } from '../../common/guards/sesion-admin.guard.js';
import type { PeticionConSesion } from '../../common/types/peticion-sesion.js';
import { leerConfiguracionSesion } from '../../config/sesion.js';
import { AutorizacionAdministradorService } from '../administradores/services/autorizacion-administrador.service.js';
import type { SesionActualDto } from './dto/sesion-actual.dto.js';
import { GoogleAuthService } from './services/google-auth.service.js';
import { CookieSesionService } from './services/cookie-sesion.service.js';
import {
  AlmacenSesionesNoDisponibleError,
  SesionAdminService,
} from './services/sesion-admin.service.js';

export const COOKIE_TRANSACCION_OAUTH = 'fenix_oauth_tx';

/**
 * Endpoints de autenticación administrativa.
 *
 * - `GET /api/auth/google`: inicia el flujo y redirige a Google.
 * - `GET /api/auth/google/callback`: recibe la respuesta de Google, crea la
 *   sesión de aplicación y redirige al frontend administrativo.
 * - `GET /api/auth/me`: devuelve la información mínima del administrador
 *   autenticado.
 * - `POST /api/auth/logout`: invalida la sesión en el servidor y elimina la
 *   cookie.
 *
 * La ruta del callback incluye el prefijo global `api`, por lo que la URI de
 * redirección registrada en Google Cloud Console debe ser exactamente
 * `https://<host>/api/auth/google/callback`.
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly googleAuth: GoogleAuthService,
    private readonly config: ConfigService,
    private readonly sesiones: SesionAdminService,
    private readonly cookies: CookieSesionService,
    private readonly autorizacion: AutorizacionAdministradorService,
  ) {}

  @Get('google')
  async iniciar(@Res() response: Response): Promise<void> {
    const inicio = await this.googleAuth.iniciar();

    response.cookie(COOKIE_TRANSACCION_OAUTH, inicio.vinculacionNavegador, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookiesSeguras(),
      signed: true,
      maxAge: inicio.ttlSegundos * 1_000,
      path: this.rutaCookie(),
    });

    response.redirect(HttpStatus.FOUND, inicio.url.toString());
  }

  /**
   * Callback de Google: valida la identidad, confirma la autorización del
   * administrador, crea la sesión de aplicación, establece la cookie segura y
   * redirige al frontend administrativo.
   *
   * La redirección **nunca** se toma de la petición: se usa siempre la URL
   * configurada en `AUTH_REDIRECT_URL`, cuyo origen está en la lista de
   * orígenes CORS permitidos.
   */
  @Get('google/callback')
  async recibirCallback(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const vinculacion = request.signedCookies?.[COOKIE_TRANSACCION_OAUTH];

    const resultado = await this.googleAuth.completar({
      code: query.code,
      state: query.state,
      issuer: query.iss,
      error: query.error,
      vinculacionNavegador:
        typeof vinculacion === 'string' ? vinculacion : undefined,
      rutaRecibida: rutaDePeticion(request),
    });

    if (resultado.estado !== 'autorizado') {
      throw new UnauthorizedException(
        'El flujo de autenticación no ha concluido correctamente',
      );
    }

    // La sesión se persiste antes de conceder acceso: si el almacenamiento
    // falla, no se establece ninguna cookie y el administrador no entra.
    const sesion = await this.crearSesion(resultado.administrador.id);

    this.cookies.establecer(response, sesion.token, sesion.expiraEn);
    this.limpiarCookieTransaccion(response);

    await this.registrarAcceso(resultado.administrador.id);

    response.redirect(HttpStatus.FOUND, this.redireccionPermitida());
  }

  /**
   * Consulta de la sesión actual. Devuelve únicamente información mínima y
   * exige `Cache-Control: no-store` para que ningún intermediario cachee la
   * respuesta.
   */
  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(SesionAdminGuard)
  async sesionActual(
    @Req() request: PeticionConSesion,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SesionActualDto> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');

    const sesion = request.sesionAdmin;
    const administrador = request.administradorSesion;

    if (!sesion || !administrador) {
      // El guard ya ha validado la sesión: si aquí falta el contexto, la
      // petición no puede servirse de forma segura.
      throw new UnauthorizedException(
        'No hay una sesión administrativa activa',
      );
    }

    return {
      autenticado: true,
      administrador: {
        id: administrador.id,
        nombre: administrador.nombre,
      },
      csrfToken: sesion.csrfToken,
      expiraEn: sesion.expiraEn.toISOString(),
    };
  }

  /**
   * Cierre de sesión: invalida la sesión en el servidor y elimina la cookie.
   * La operación está protegida frente a CSRF.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SesionAdminGuard, CsrfGuard)
  async cerrarSesion(
    @Req() request: PeticionConSesion,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sesion = request.sesionAdmin;

    if (sesion) {
      await this.sesiones.revocar(sesion, 'logout');
    }

    this.cookies.eliminar(response);
  }

  /**
   * Crea la sesión de aplicación. Si el almacén no está disponible no se
   * concede acceso administrativo: la respuesta es `503` y no se establece
   * ninguna cookie.
   */
  private async crearSesion(administradorId: string) {
    try {
      return await this.sesiones.crear(administradorId);
    } catch (error) {
      if (error instanceof AlmacenSesionesNoDisponibleError) {
        this.logger.error(
          'No se pudo crear la sesión administrativa',
          error.causa instanceof Error
            ? error.causa.stack
            : String(error.causa),
        );

        throw new ServiceUnavailableException(
          'No es posible crear la sesión administrativa en este momento',
        );
      }

      throw error;
    }
  }

  /**
   * Registra el último acceso. Un fallo al registrarlo no debe impedir el
   * inicio de sesión ya realizado.
   */
  private async registrarAcceso(administradorId: string): Promise<void> {
    try {
      await this.autorizacion.registrarAcceso(administradorId);
    } catch (error) {
      this.logger.warn(
        'No se pudo registrar el último acceso del administrador',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /** Frontend administrativo permitido. Nunca proviene del navegador. */
  private redireccionPermitida(): string {
    return leerConfiguracionSesion(this.config).redirectUrl;
  }

  private cookiesSeguras(): boolean {
    return leerConfiguracionSesion(this.config).cookieSecure;
  }

  private limpiarCookieTransaccion(response: Response): void {
    response.clearCookie(COOKIE_TRANSACCION_OAUTH, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookiesSeguras(),
      path: this.rutaCookie(),
    });
  }

  /**
   * Ruta de la cookie de transacción: el directorio de la URI de redirección
   * configurada, de modo que la cookie se envíe tanto al iniciar el flujo
   * como al recibir la respuesta.
   */
  private rutaCookie(): string {
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL');
    if (!callbackUrl) {
      return '/api/auth/google';
    }

    const ruta = new URL(callbackUrl).pathname.replace(/\/+$/, '');
    const indice = ruta.lastIndexOf('/');

    return indice > 0 ? ruta.slice(0, indice) : '/';
  }
}

function rutaDePeticion(request: Request): string {
  return request.originalUrl.split('?')[0];
}
