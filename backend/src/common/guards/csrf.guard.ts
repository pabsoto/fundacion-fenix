import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { comparacionSegura } from '../utils/comparacion-segura.js';
import type { PeticionConSesion } from '../types/peticion-sesion.js';

/** Cabecera que transporta el token anti-CSRF. */
export const CABECERA_CSRF = 'x-csrf-token';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guard de protección CSRF para las operaciones que modifican datos.
 *
 * La aplicación usa cookies de sesión, por lo que el navegador envía
 * automáticamente las credenciales y una petición originada en otro sitio
 * podría ejecutarse en nombre del administrador. La protección se compone de:
 *
 * 1. **Token anti-CSRF ligado a la sesión**: el frontend lo obtiene en
 *    `GET /api/auth/me` y lo envía en la cabecera `X-CSRF-Token`. El servidor
 *    lo compara en tiempo constante con el valor almacenado junto a la
 *    sesión. Un token inventado, o el de otra sesión, se rechaza.
 * 2. **Comprobación del origen**: si la petición incluye la cabecera
 *    `Origin`, su valor debe estar en la lista de orígenes CORS explícitos.
 *
 * La comprobación es "fail closed": si no hay contexto de sesión, la
 * petición se rechaza.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PeticionConSesion>();

    if (METODOS_SEGUROS.has(request.method.toUpperCase())) {
      return true;
    }

    this.comprobarOrigen(request);

    const sesion = request.sesionAdmin;
    if (!sesion) {
      throw new ForbiddenException(
        'No hay una sesión administrativa válida para completar la operación',
      );
    }

    const cabecera = request.headers[CABECERA_CSRF];
    const token = Array.isArray(cabecera) ? cabecera[0] : cabecera;

    if (typeof token !== 'string' || token.length === 0) {
      throw new ForbiddenException(
        'Falta el token anti-CSRF en la cabecera X-CSRF-Token',
      );
    }

    if (!comparacionSegura(token, sesion.csrfToken)) {
      throw new ForbiddenException('El token anti-CSRF no es válido');
    }

    return true;
  }

  private comprobarOrigen(request: PeticionConSesion): void {
    const origen = request.headers.origin;
    if (typeof origen !== 'string' || origen === '') {
      return;
    }

    const permitidos = (this.config.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((valor) => valor.trim())
      .filter((valor) => valor !== '');

    if (!permitidos.includes(origen)) {
      throw new ForbiddenException(
        'El origen de la petición no está autorizado',
      );
    }
  }
}
