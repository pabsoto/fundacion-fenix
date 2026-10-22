import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IdentidadGoogleVerificada } from '../dto/identidad-google-verificada.js';
import { Administrador } from '../entities/administrador.entity.js';

/**
 * Representación interna mínima de un administrador autorizado. No contiene
 * datos sensibles ni secretos de autenticación.
 */
export interface AdministradorAutorizado {
  readonly id: string;
  readonly nombre: string;
  readonly email: string;
  readonly googleSub: string | null;
  readonly vinculado: boolean;
}

export type MotivoRechazoAutorizacion =
  'inexistente' | 'inactivo' | 'correo_no_verificado' | 'vinculacion_otro_sub';

export type ResultadoAutorizacion =
  | {
      readonly estado: 'autorizado';
      readonly administrador: AdministradorAutorizado;
    }
  | {
      readonly estado: 'no_autorizado';
      readonly motivo: MotivoRechazoAutorizacion;
    }
  | {
      readonly estado: 'vinculacion_pendiente';
      readonly administrador: AdministradorAutorizado;
    };

/**
 * Estado de la cuenta administrativa a la que apunta una sesión existente.
 *
 * - `activo`: la cuenta existe y puede usar el panel administrativo.
 * - `inactivo`: la cuenta existe pero está desactivada: pierde el acceso
 *   aunque conserve una cookie de sesión anterior.
 * - `inexistente`: la cuenta ya no existe: la sesión deja de ser válida.
 */
export type EstadoAdministradorParaSesion =
  | {
      readonly estado: 'activo';
      readonly administrador: AdministradorAutorizado;
    }
  | { readonly estado: 'inactivo' }
  | { readonly estado: 'inexistente' };

/**
 * Autoriza a un administrador contra la tabla `public.administradores`.
 *
 * La autorización NO se deduce del dominio del correo ni del parámetro `hd`
 * de Google: la única fuente de verdad es el registro previamente aprobado en
 * PostgreSQL.
 */
@Injectable()
export class AutorizacionAdministradorService {
  constructor(
    @InjectRepository(Administrador)
    private readonly repositorio: Repository<Administrador>,
  ) {}

  async autorizar(
    identidad: IdentidadGoogleVerificada,
  ): Promise<ResultadoAutorizacion> {
    if (!identidad.emailVerified) {
      return { estado: 'no_autorizado', motivo: 'correo_no_verificado' };
    }

    const email = identidad.email.trim().toLowerCase();
    const administrador = await this.repositorio.findOne({ where: { email } });

    if (!administrador) {
      return { estado: 'no_autorizado', motivo: 'inexistente' };
    }

    if (!administrador.activo) {
      return { estado: 'no_autorizado', motivo: 'inactivo' };
    }

    if (
      administrador.googleSub !== null &&
      administrador.googleSub !== identidad.sub
    ) {
      return { estado: 'no_autorizado', motivo: 'vinculacion_otro_sub' };
    }

    const autorizado: AdministradorAutorizado = {
      id: administrador.id,
      nombre: administrador.nombre,
      email: administrador.email,
      googleSub: administrador.googleSub,
      vinculado: administrador.googleSub !== null,
    };

    if (administrador.googleSub === null) {
      return { estado: 'vinculacion_pendiente', administrador: autorizado };
    }

    return { estado: 'autorizado', administrador: autorizado };
  }

  /**
   * Resuelve la cuenta administrativa asociada a una sesión existente.
   *
   * Es la comprobación que realiza el guard de sesión en cada petición: la
   * sesión puede seguir vigente en PostgreSQL mientras la cuenta se ha
   * desactivado o se ha eliminado.
   */
  async cargarParaSesion(
    administradorId: string,
  ): Promise<EstadoAdministradorParaSesion> {
    const administrador = await this.repositorio.findOne({
      where: { id: administradorId },
    });

    if (!administrador) {
      return { estado: 'inexistente' };
    }

    if (!administrador.activo) {
      return { estado: 'inactivo' };
    }

    return {
      estado: 'activo',
      administrador: {
        id: administrador.id,
        nombre: administrador.nombre,
        email: administrador.email,
        googleSub: administrador.googleSub,
        vinculado: administrador.googleSub !== null,
      },
    };
  }

  /**
   * Registra el último acceso del administrador. No es un control de
   * autorización: su fallo no debe impedir el inicio de sesión.
   */
  async registrarAcceso(administradorId: string): Promise<void> {
    await this.repositorio.update(administradorId, {
      ultimoAcceso: new Date(),
    });
  }
}
