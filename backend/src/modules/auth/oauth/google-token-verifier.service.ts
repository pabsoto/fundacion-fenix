import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errors, jwtVerify, type JWTPayload } from 'jose';
import { comparacionSegura } from '../../../common/utils/comparacion-segura.js';
import type { IdentidadGoogleVerificada } from '../../administradores/dto/identidad-google-verificada.js';
import { GoogleAuthError } from './google-auth.errors.js';
import {
  PROVEEDOR_CLAVES_GOOGLE,
  type ProveedorClavesGoogle,
} from './google-jwks.provider.js';

export interface VerificacionIdTokenGoogle {
  readonly idToken: string;
  readonly nonce: string;
}

/** Emisores aceptados por Google en el claim `iss` del ID token. */
const EMISORES_ACEPTADOS = [
  'https://accounts.google.com',
  'accounts.google.com',
];

@Injectable()
export class VerificadorIdTokenGoogleService {
  constructor(
    private readonly config: ConfigService,
    @Inject(PROVEEDOR_CLAVES_GOOGLE)
    private readonly claves: ProveedorClavesGoogle,
  ) {}

  /**
   * Verifica el ID token emitido por Google:
   *
   * - firma criptográfica contra las claves oficiales de Google (JWKS);
   * - `iss` dentro de los emisores conocidos de Google;
   * - `aud` igual al `GOOGLE_CLIENT_ID` configurado;
   * - `exp` (y `nbf`) vigente, con una tolerancia mínima de reloj;
   * - `nonce` idéntico al generado para la transacción en curso;
   * - `email_verified = true` y presencia de `sub`.
   */
  async verificar(
    idToken: string,
    esperado: { nonce: string },
  ): Promise<IdentidadGoogleVerificada> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new GoogleAuthError(
        'configuracion_invalida',
        'La autenticación con Google no está configurada en el servidor',
      );
    }

    let payload: JWTPayload;
    try {
      const resultado = await jwtVerify(
        idToken,
        this.claves.obtenerResolver(),
        {
          audience: clientId,
          issuer: EMISORES_ACEPTADOS,
          requiredClaims: [
            'iss',
            'aud',
            'sub',
            'exp',
            'iat',
            'email',
            'email_verified',
            'nonce',
          ],
          clockTolerance: 5,
        },
      );
      payload = resultado.payload;
    } catch (error) {
      throw this.traducirError(error);
    }

    const nonce = payload.nonce;
    if (
      typeof nonce !== 'string' ||
      !comparacionSegura(nonce, esperado.nonce)
    ) {
      throw new GoogleAuthError(
        'token_nonce_invalido',
        'El ID token no corresponde a la solicitud de autenticación iniciada',
      );
    }

    const sub = payload.sub;
    if (typeof sub !== 'string' || sub.trim() === '') {
      throw new GoogleAuthError(
        'token_claims_invalidos',
        'El ID token no contiene un identificador de.subject válido',
      );
    }

    const email = payload.email;
    if (typeof email !== 'string' || email.trim() === '') {
      throw new GoogleAuthError(
        'token_claims_invalidos',
        'El ID token no contiene un correo válido',
      );
    }

    if (payload.email_verified !== true) {
      throw new GoogleAuthError(
        'correo_no_verificado',
        'Google no confirma que el correo de la cuenta esté verificado',
      );
    }

    const azp = payload.azp;
    if (typeof azp === 'string' && azp !== clientId) {
      throw new GoogleAuthError(
        'token_audiencia_invalida',
        'El ID token fue emitido para otra aplicación cliente',
      );
    }

    return {
      sub,
      email: email.trim().toLowerCase(),
      emailVerified: true,
      ...(typeof payload.name === 'string' ? { name: payload.name } : {}),
    };
  }

  private traducirError(error: unknown): GoogleAuthError {
    if (error instanceof GoogleAuthError) {
      return error;
    }

    if (error instanceof errors.JWTExpired) {
      return new GoogleAuthError(
        'token_expirado',
        'El ID token de Google está expirado',
        error,
      );
    }

    if (error instanceof errors.JWSSignatureVerificationFailed) {
      return new GoogleAuthError(
        'token_firma_invalida',
        'La firma del ID token de Google no es válida',
        error,
      );
    }

    if (error instanceof errors.JWKSNoMatchingKey) {
      return new GoogleAuthError(
        'token_firma_invalida',
        'No se encontró una clave de Google que valide el ID token',
        error,
      );
    }

    if (error instanceof errors.JWTClaimValidationFailed) {
      const codigo =
        error.claim === 'aud'
          ? 'token_audiencia_invalida'
          : error.claim === 'iss'
            ? 'token_emitente_invalido'
            : 'token_claims_invalidos';

      return new GoogleAuthError(
        codigo,
        'El ID token de Google no cumple los criterios de validación',
        error,
      );
    }

    return new GoogleAuthError(
      'token_claims_invalidos',
      'El ID token de Google no es válido',
      error,
    );
  }
}
