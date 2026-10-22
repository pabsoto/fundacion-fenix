import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import {
  AutorizacionAdministradorService,
  type ResultadoAutorizacion,
} from '../../administradores/services/autorizacion-administrador.service.js';
import { comparacionSegura } from '../../../common/utils/comparacion-segura.js';
import { GoogleAuthError } from '../oauth/google-auth.errors.js';
import { ClienteOAuthGoogleService } from '../oauth/google-oauth-client.service.js';
import { VerificadorIdTokenGoogleService } from '../oauth/google-token-verifier.service.js';
import {
  AlmacenTransaccionesOAuth,
  ErrorDemasiadasTransacciones,
} from '../oauth/oauth-transaction.store.js';

export interface InicioAutenticacionGoogle {
  readonly url: URL;
  readonly vinculacionNavegador: string;
  readonly ttlSegundos: number;
}

export interface ParametrosCallbackGoogle {
  readonly code?: string;
  readonly state?: string;
  readonly issuer?: string;
  readonly error?: string;
  readonly vinculacionNavegador?: string;
  readonly rutaRecibida: string;
}

export interface ResultadoAutenticacionGoogle {
  readonly estado: 'autorizado';
  readonly mensaje: string;
  readonly sesion: { readonly creada: false };
  readonly administrador: { readonly id: string; readonly nombre: string };
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cliente: ClienteOAuthGoogleService,
    private readonly verificador: VerificadorIdTokenGoogleService,
    private readonly transacciones: AlmacenTransaccionesOAuth,
    private readonly autorizacion: AutorizacionAdministradorService,
  ) {}

  /**
   * Inicia el flujo de autorización: genera `state`, `nonce` y el secreto PKCE,
   * los conserva en el almacén de transacciones y devuelve la URL de Google.
   */
  async iniciar(): Promise<InicioAutenticacionGoogle> {
    const configuracion = this.leerConfiguracion();

    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const vinculacionNavegador = randomBytes(32).toString('base64url');
    const ahora = Date.now();

    try {
      this.transacciones.registrar({
        state,
        nonce,
        codeVerifier,
        vinculacionNavegador,
        creadaEn: ahora,
        expiraEn: ahora + configuracion.ttlSegundos * 1_000,
      });
    } catch (error) {
      if (error instanceof ErrorDemasiadasTransacciones) {
        throw new GoogleAuthError(
          'demasiadas_solicitudes',
          'Hay demasiadas solicitudes de autenticación en curso; inténtalo de nuevo en unos minutos',
          error,
        );
      }

      throw error;
    }

    const url = await this.cliente.construirUrlAutorizacion({
      state,
      nonce,
      codeChallenge: await calculatePKCECodeChallenge(codeVerifier),
      redirectUri: configuracion.callbackUrl,
    });

    return {
      url,
      vinculacionNavegador,
      ttlSegundos: configuracion.ttlSegundos,
    };
  }

  /**
   * Completa el flujo: valida la respuesta de Google, verifica el ID token y
   * comprueba la autorización del administrador en PostgreSQL.
   *
   * El resultado indica que la identidad está verificada y que la cuenta
   * administrativa está autorizada. La sesión de aplicación se crea en la
   * capa HTTP (Etapa 5), una vez validado este resultado.
   */
  async completar(
    parametros: ParametrosCallbackGoogle,
  ): Promise<ResultadoAutenticacionGoogle> {
    const configuracion = this.leerConfiguracion();

    if (parametros.error) {
      this.logger.warn(
        `Google devolvió un error en la respuesta de autorización: ${parametros.error}`,
      );
      throw new GoogleAuthError(
        'error_proveedor',
        'La autenticación con Google no fue completada',
      );
    }

    if (!parametros.code || !parametros.state) {
      throw new GoogleAuthError(
        'state_invalido',
        'La respuesta de Google no contiene los parámetros de estado y código',
      );
    }

    this.validarRutaCallback(
      configuracion.callbackUrl,
      parametros.rutaRecibida,
    );

    const consumo = this.transacciones.consumir(parametros.state);
    if (consumo.estado === 'no_encontrada') {
      throw new GoogleAuthError(
        'state_invalido',
        'La solicitud de autenticación no corresponde a una transacción vigente',
      );
    }

    if (consumo.estado === 'expirada') {
      throw new GoogleAuthError(
        'transaccion_expirada',
        'La solicitud de autenticación ha caducado; inicia el proceso nuevamente',
      );
    }

    const transaccion = consumo.transaccion;

    if (
      !parametros.vinculacionNavegador ||
      !comparacionSegura(
        parametros.vinculacionNavegador,
        transaccion.vinculacionNavegador,
      )
    ) {
      throw new GoogleAuthError(
        'vinculacion_navegador_invalida',
        'La respuesta de autenticación no corresponde al navegador que inició el proceso',
      );
    }

    const { idToken } = await this.cliente.canjearCodigo({
      code: parametros.code,
      codeVerifier: transaccion.codeVerifier,
      state: transaccion.state,
      issuer: parametros.issuer,
      nonce: transaccion.nonce,
      redirectUri: configuracion.callbackUrl,
    });

    const identidad = await this.verificador.verificar(idToken, {
      nonce: transaccion.nonce,
    });

    const resultado = await this.autorizacion.autorizar(identidad);

    return this.construirResultado(resultado);
  }

  private construirResultado(
    resultado: ResultadoAutorizacion,
  ): ResultadoAutenticacionGoogle {
    if (resultado.estado === 'no_autorizado') {
      this.logger.warn(
        `Autorización denegada para la identidad verificada de Google (motivo interno: ${resultado.motivo})`,
      );
      throw new GoogleAuthError(
        'autorizacion_denegada',
        'Las credenciales de Google no corresponden a una cuenta administrativa autorizada',
      );
    }

    if (resultado.estado === 'vinculacion_pendiente') {
      this.logger.warn(
        `La cuenta administrativa ${resultado.administrador.id} requiere vinculación inicial de identidad Google`,
      );
      throw new GoogleAuthError(
        'vinculacion_pendiente',
        'La cuenta administrativa requiere el procedimiento de vinculación inicial de identidad Google',
      );
    }

    return {
      estado: 'autorizado',
      mensaje:
        'Identidad de Google verificada y administrador autorizado. La sesión de aplicación se crea al establecer la cookie de sesión.',
      sesion: { creada: false },
      administrador: {
        id: resultado.administrador.id,
        nombre: resultado.administrador.nombre,
      },
    };
  }

  private validarRutaCallback(callbackUrl: string, rutaRecibida: string): void {
    const rutaConfigurada = normalizarRuta(new URL(callbackUrl).pathname);
    const ruta = normalizarRuta(rutaRecibida);

    if (rutaConfigurada !== ruta) {
      throw new GoogleAuthError(
        'state_invalido',
        'La respuesta de autenticación no fue recibida en la ruta de redirección configurada',
      );
    }
  }

  private leerConfiguracion(): {
    readonly callbackUrl: string;
    readonly ttlSegundos: number;
  } {
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL');
    const ttlSegundos = Number(
      this.config.get<string>('GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS') ?? '600',
    );

    if (!callbackUrl || !Number.isInteger(ttlSegundos) || ttlSegundos <= 0) {
      throw new GoogleAuthError(
        'configuracion_invalida',
        'La autenticación con Google no está configurada en el servidor',
      );
    }

    return { callbackUrl, ttlSegundos };
  }
}

function normalizarRuta(ruta: string): string {
  const sinBarraFinal = ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
  return sinBarraFinal === '' ? '/' : sinBarraFinal;
}
