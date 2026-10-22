import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  leerConfiguracionSesion,
  type ConfiguracionSesion,
} from '../../../config/sesion.js';
import { SesionAdmin } from '../entities/sesion-admin.entity.js';

/**
 * Motivos por los que una sesión puede dejar de ser utilizable. Se registran
 * en el log del servidor, nunca en la respuesta al navegador.
 */
export type MotivoRechazoSesion =
  'desconocida' | 'expirada' | 'revocada' | 'almacen_no_disponible';

/**
 * Error de dominio de las sesiones administrativas. Lo consumen los guards
 * para distinguir entre `401` (sesión ausente, inválida o vencida) y `503`
 * (almacén de sesiones no disponible).
 */
export class ErrorSesion extends Error {
  constructor(
    readonly motivo: MotivoRechazoSesion,
    message: string,
    readonly causa?: unknown,
  ) {
    super(message);
    this.name = 'ErrorSesion';
  }
}

/** La sesión no existe, fue alterada o nunca se creó. */
export class SesionDesconocidaError extends ErrorSesion {
  constructor(causa?: unknown) {
    super(
      'desconocida',
      'La sesión administrativa no existe o no es válida',
      causa,
    );
    this.name = 'SesionDesconocidaError';
  }
}

/** La sesión superó su caducidad por inactividad o su tiempo máximo absoluto. */
export class SesionExpiradaError extends ErrorSesion {
  constructor(causa?: unknown) {
    super('expirada', 'La sesión administrativa ha caducado', causa);
    this.name = 'SesionExpiradaError';
  }
}

/** La sesión fue revocada explícitamente (por ejemplo, al cerrar sesión). */
export class SesionRevocadaError extends ErrorSesion {
  constructor(causa?: unknown) {
    super('revocada', 'La sesión administrativa ha sido revocada', causa);
    this.name = 'SesionRevocadaError';
  }
}

/**
 * PostgreSQL no está disponible (o la tabla de sesiones aún no existe). La
 * autorización debe fallar de forma segura: nunca se concede acceso.
 */
export class AlmacenSesionesNoDisponibleError extends ErrorSesion {
  constructor(causa?: unknown) {
    super(
      'almacen_no_disponible',
      'El almacén de sesiones administrativas no está disponible',
      causa,
    );
    this.name = 'AlmacenSesionesNoDisponibleError';
  }
}

/** Estado de una sesión válida, tal y como la consume el resto de la aplicación. */
export interface ContextoSesion {
  readonly id: string;
  readonly administradorId: string;
  readonly csrfToken: string;
  readonly creadaEn: Date;
  readonly tokenEmitidoEn: Date;
  readonly ultimaActividadEn: Date;
  readonly expiraEn: Date;
}

/** Sesión emitida: el `token` es el único valor que viaja al navegador. */
export interface SesionEmitida {
  readonly token: string;
  readonly csrfToken: string;
  readonly expiraEn: Date;
  readonly contexto: ContextoSesion;
}

/** Resultado de validar un token presentado por el navegador. */
export interface ValidacionSesion {
  readonly contexto: ContextoSesion;
  /** `true` cuando el identificador de sesión debe renovarse. */
  readonly requiereRotacion: boolean;
}

/** Motivos admitidos para revocar una sesión. */
export type MotivoRevocacionSesion = 'logout' | 'administrador_inactivo';

const LONGITUD_TOKEN_BYTES = 32;

/**
 * Servicio de sesiones administrativas.
 *
 * Estrategia: **sesión opaca persistida en servidor**.
 *
 * - El identificador de sesión es un valor aleatorio de 256 bits generado con
 *   `randomBytes`, criptográficamente seguro y opaco para el navegador.
 * - En PostgreSQL sólo se almacena el resumen SHA-256 del identificador: un
 *   volcado de la tabla no permite autenticarse.
 * - La validez se persiste, de modo que las sesiones sobreviven a un
 *   reinicio del backend y pueden revocarse en cualquier momento.
 * - No se emiten JWT: una sesión revocada debe serrejectada de inmediato, lo
 *   que un token autocontenido no permite sin una lista de revocación.
 */
@Injectable()
export class SesionAdminService {
  constructor(
    @InjectRepository(SesionAdmin)
    private readonly repositorio: Repository<SesionAdmin>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Crea una sesión nueva para el administrador indicado.
   *
   * Siempre genera un identificador nuevo: nunca reutiliza el que pudiera
   * traer el navegador, lo que evita ataques de fijación de sesión.
   */
  async crear(administradorId: string): Promise<SesionEmitida> {
    const configuracion = this.leerConfiguracion();
    const ahora = new Date();
    const expiraEn = new Date(
      ahora.getTime() + configuracion.absoluteTimeoutSegundos * 1_000,
    );

    const token = generarToken();
    const csrfToken = generarToken();

    const sesion = this.repositorio.create({
      administradorId,
      tokenHash: resumirToken(token),
      csrfToken,
      creadaEn: ahora,
      tokenEmitidoEn: ahora,
      ultimaActividadEn: ahora,
      expiraEn,
      revocadaEn: null,
      motivoRevocacion: null,
    });

    try {
      await this.repositorio.save(sesion);
    } catch (error) {
      throw new AlmacenSesionesNoDisponibleError(error);
    }

    return {
      token,
      csrfToken,
      expiraEn,
      contexto: {
        id: sesion.id,
        administradorId,
        csrfToken,
        creadaEn: ahora,
        tokenEmitidoEn: ahora,
        ultimaActividadEn: ahora,
        expiraEn,
      },
    };
  }

  /**
   * Valida el identificador presentado por el navegador.
   *
   * Rechaza sesiones desconocidas (token alterado), revocadas, vencidas por
   * inactividad o vencidas por tiempo máximo absoluto. Actualiza la última
   * actividad para reiniciar la cuenta de inactividad.
   */
  async validar(token: string): Promise<ValidacionSesion> {
    const configuracion = this.leerConfiguracion();
    const ahora = new Date();

    let sesion: SesionAdmin | null;
    try {
      sesion = await this.repositorio.findOne({
        where: { tokenHash: resumirToken(token) },
      });
    } catch (error) {
      throw new AlmacenSesionesNoDisponibleError(error);
    }

    if (!sesion) {
      throw new SesionDesconocidaError();
    }

    if (sesion.revocadaEn !== null) {
      throw new SesionRevocadaError();
    }

    if (sesion.expiraEn.getTime() <= ahora.getTime()) {
      throw new SesionExpiradaError();
    }

    const inactividadMs = ahora.getTime() - sesion.ultimaActividadEn.getTime();
    if (inactividadMs > configuracion.idleTimeoutSegundos * 1_000) {
      throw new SesionExpiradaError();
    }

    try {
      await this.repositorio.update(sesion.id, { ultimaActividadEn: ahora });
    } catch (error) {
      throw new AlmacenSesionesNoDisponibleError(error);
    }

    const requiereRotacion =
      configuracion.rotationIntervalSegundos > 0 &&
      ahora.getTime() - sesion.tokenEmitidoEn.getTime() >=
        configuracion.rotationIntervalSegundos * 1_000;

    return {
      requiereRotacion,
      contexto: {
        id: sesion.id,
        administradorId: sesion.administradorId,
        csrfToken: sesion.csrfToken,
        creadaEn: sesion.creadaEn,
        tokenEmitidoEn: sesion.tokenEmitidoEn,
        ultimaActividadEn: ahora,
        expiraEn: sesion.expiraEn,
      },
    };
  }

  /**
   * Rota el identificador de la sesión: el anterior deja de ser válido y se
   * emite uno nuevo. El token CSRF no cambia, para no invalidar el token que
   * el frontend mantiene en memoria.
   */
  async rotar(contexto: ContextoSesion): Promise<string> {
    const token = generarToken();
    const ahora = new Date();

    try {
      const resultado = await this.repositorio.update(contexto.id, {
        tokenHash: resumirToken(token),
        tokenEmitidoEn: ahora,
        ultimaActividadEn: ahora,
      });

      if (resultado.affected !== 1) {
        throw new SesionDesconocidaError();
      }
    } catch (error) {
      if (error instanceof ErrorSesion) {
        throw error;
      }

      throw new AlmacenSesionesNoDisponibleError(error);
    }

    return token;
  }

  /**
   * Revoca la sesión. La operación es efectiva: cualquier uso posterior del
   * identificador es rechazado aunque el navegador conserve la cookie.
   */
  async revocar(
    contexto: ContextoSesion,
    motivo: MotivoRevocacionSesion,
  ): Promise<void> {
    try {
      await this.repositorio.update(contexto.id, {
        revocadaEn: new Date(),
        motivoRevocacion: motivo,
      });
    } catch (error) {
      throw new AlmacenSesionesNoDisponibleError(error);
    }
  }

  private leerConfiguracion(): ConfiguracionSesion {
    return leerConfiguracionSesion(this.config);
  }
}

/** Identificador aleatorio, criptográficamente seguro y opaco. */
export function generarToken(): string {
  return randomBytes(LONGITUD_TOKEN_BYTES).toString('base64url');
}

/** Resumen SHA-256 en hexadecimal: es lo único que se guarda en PostgreSQL. */
export function resumirToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
