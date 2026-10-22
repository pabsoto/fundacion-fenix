import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { IdentidadGoogleVerificada } from '../dto/identidad-google-verificada.js';
import { Administrador } from '../entities/administrador.entity.js';

export type MotivoErrorVinculacion =
  | 'inexistente'
  | 'inactivo'
  | 'ya_vinculado'
  | 'correo_no_coincide'
  | 'identidad_no_coincide'
  | 'sub_ya_asignado'
  | 'conflicto_concurrente';

/**
 * Error del procedimiento de vinculación inicial. No es un error HTTP: el
 * procedimiento se ejecuta de forma aislada (herramienta de línea de comandos)
 * y nunca desde un endpoint público.
 */
export class ErrorVinculacionGoogle extends Error {
  constructor(
    readonly motivo: MotivoErrorVinculacion,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorVinculacionGoogle';
  }
}

export interface PreparacionVinculacion {
  readonly administradorId: string;
  readonly nombre: string;
  readonly email: string;
  readonly sub: string;
}

/**
 * Procedimiento aislado de vinculación inicial de una identidad de Google con
 * una cuenta administrativa previamente aprobada.
 *
 * Reglas de seguridad:
 * - la cuenta debe existir, estar activa y tener `google_sub IS NULL`;
 * - el correo de la identidad verificada por Google debe coincidir con el
 *   correo registrado de la cuenta;
 * - una vinculación existente nunca se sobrescribe;
 * - un `sub` que ya esté vinculado a otra cuenta no puede reutilizarse;
 * - la escritura se realiza con una condición `google_sub IS NULL`, de modo
 *   que dos ejecuciones simultáneas no puedan sobrescribirse.
 */
@Injectable()
export class VinculacionGoogleService {
  constructor(
    @InjectRepository(Administrador)
    private readonly repositorio: Repository<Administrador>,
  ) {}

  /**
   * Fase de verificación: comprueba que la identidad de Google verificada
   * corresponde a una cuenta administrativa aprobada y devuelve el `sub`
   * candidato. No escribe ningún dato.
   */
  async preparar(
    email: string,
    identidad: IdentidadGoogleVerificada,
  ): Promise<PreparacionVinculacion> {
    const normalizado = email.trim().toLowerCase();
    const administrador = await this.repositorio.findOne({
      where: { email: normalizado },
    });

    if (!administrador) {
      throw new ErrorVinculacionGoogle(
        'inexistente',
        `No existe una cuenta administrativa registrada con el correo ${normalizado}`,
      );
    }

    if (!administrador.activo) {
      throw new ErrorVinculacionGoogle(
        'inactivo',
        'La cuenta administrativa está desactivada',
      );
    }

    if (administrador.googleSub !== null) {
      throw new ErrorVinculacionGoogle(
        'ya_vinculado',
        'La cuenta administrativa ya tiene una identidad de Google vinculada',
      );
    }

    if (administrador.email.toLowerCase() !== identidad.email.toLowerCase()) {
      throw new ErrorVinculacionGoogle(
        'correo_no_coincide',
        'El correo de la identidad de Google no coincide con el correo registrado',
      );
    }

    return {
      administradorId: administrador.id,
      nombre: administrador.nombre,
      email: administrador.email,
      sub: identidad.sub,
    };
  }

  /**
   * Fase de confirmación: escribe `google_sub` únicamente cuando la cuenta
   * sigue sin vinculación y la identidad verificada coincide.
   */
  async confirmar(params: {
    readonly administradorId: string;
    readonly sub: string;
    readonly identidad: IdentidadGoogleVerificada;
  }): Promise<Administrador> {
    const administrador = await this.repositorio.findOne({
      where: { id: params.administradorId },
    });

    if (!administrador) {
      throw new ErrorVinculacionGoogle(
        'inexistente',
        'La cuenta administrativa indicada no existe',
      );
    }

    if (!administrador.activo) {
      throw new ErrorVinculacionGoogle(
        'inactivo',
        'La cuenta administrativa está desactivada',
      );
    }

    if (administrador.googleSub !== null) {
      throw new ErrorVinculacionGoogle(
        'ya_vinculado',
        'La cuenta administrativa ya tiene una identidad de Google vinculada',
      );
    }

    if (
      administrador.email.toLowerCase() !== params.identidad.email.toLowerCase()
    ) {
      throw new ErrorVinculacionGoogle(
        'correo_no_coincide',
        'El correo de la identidad de Google no coincide con el correo registrado',
      );
    }

    if (params.identidad.sub !== params.sub) {
      throw new ErrorVinculacionGoogle(
        'identidad_no_coincide',
        'El sub confirmado no corresponde a la identidad de Google verificada',
      );
    }

    const otraCuenta = await this.repositorio.findOne({
      where: { googleSub: params.sub },
    });

    if (otraCuenta) {
      throw new ErrorVinculacionGoogle(
        'sub_ya_asignado',
        'La identidad de Google ya está vinculada a otra cuenta administrativa',
      );
    }

    const resultado = await this.repositorio.update(
      { id: administrador.id, googleSub: IsNull() },
      { googleSub: params.sub, actualizadoEn: new Date() },
    );

    if (resultado.affected !== 1) {
      throw new ErrorVinculacionGoogle(
        'conflicto_concurrente',
        'La vinculación no se aplicó: la cuenta cambió de estado durante la operación',
      );
    }

    administrador.googleSub = params.sub;
    administrador.actualizadoEn = new Date();

    return administrador;
  }
}
