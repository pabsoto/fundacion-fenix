import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GOOGLE_OAUTH_SCOPES } from '../../../config/google-oauth.js';
import {
  AuthorizationResponseError,
  ClientSecretPost,
  ResponseBodyError,
  authorizationCodeGrant,
  buildAuthorizationUrl,
  discovery,
  type Configuration,
} from 'openid-client';
import { GoogleAuthError } from './google-auth.errors.js';
export interface SolicitudAutorizacionGoogle {
  readonly state: string;
  readonly nonce: string;
  readonly codeChallenge: string;
  readonly redirectUri: string;
}

export interface CanjeCodigoGoogle {
  readonly code: string;
  readonly codeVerifier: string;
  readonly state: string;
  readonly issuer?: string;
  readonly nonce: string;
  readonly redirectUri: string;
}

export interface RespuestaCanjeGoogle {
  readonly idToken: string;
}

/**
 * Cliente OIDC para Google basado en `openid-client`.
 *
 * `openid-client` se ocupa del protocolo: descubrimiento de metadatos del
 * proveedor, construcción de la solicitud de autorización (con `state`,
 * `nonce` y PKCE), validación del `state` de la respuesta y canje del código
 * de autorización en el *token endpoint*.
 *
 * La verificación criptográfica del ID token la realiza
 * `VerificadorIdTokenGoogleService` (con `jose`), de forma explícita y
 * auditable, y no se delega en la biblioteca.
 */
@Injectable()
export class ClienteOAuthGoogleService {
  private configuracion: Promise<Configuration> | undefined;

  constructor(private readonly config: ConfigService) {}

  async construirUrlAutorizacion(
    solicitud: SolicitudAutorizacionGoogle,
  ): Promise<URL> {
    const configuracion = await this.obtenerConfiguracion();

    return buildAuthorizationUrl(configuracion, {
      redirect_uri: solicitud.redirectUri,
      response_type: 'code',
      scope: GOOGLE_OAUTH_SCOPES.join(' '),
      state: solicitud.state,
      nonce: solicitud.nonce,
      code_challenge: solicitud.codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
  }

  /**
   * Canjea el código de autorización por el ID token. El `redirect_uri` se
   * construye a partir de la URL configurada para garantizar que coincide
   * exactamente con la registrada en Google Cloud Console.
   */
  async canjearCodigo(canje: CanjeCodigoGoogle): Promise<RespuestaCanjeGoogle> {
    const configuracion = await this.obtenerConfiguracion();

    const urlCallback = new URL(canje.redirectUri);
    urlCallback.searchParams.set('code', canje.code);
    urlCallback.searchParams.set('state', canje.state);
    if (canje.issuer) {
      urlCallback.searchParams.set('iss', canje.issuer);
    }

    let tokens;
    try {
      tokens = await authorizationCodeGrant(configuracion, urlCallback, {
        expectedState: canje.state,
        expectedNonce: canje.nonce,
        pkceCodeVerifier: canje.codeVerifier,
      });
    } catch (error) {
      throw this.traducirError(error);
    }

    if (!tokens.id_token) {
      throw new GoogleAuthError(
        'token_claims_invalidos',
        'Google no devolvió un ID token en la respuesta de autenticación',
      );
    }

    return { idToken: tokens.id_token };
  }

  private async obtenerConfiguracion(): Promise<Configuration> {
    this.configuracion ??= this.descubrirProveedor();
    return this.configuracion;
  }

  private async descubrirProveedor(): Promise<Configuration> {
    const issuer = this.config.get<string>('GOOGLE_OAUTH_ISSUER');
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.config.get<string>('GOOGLE_CALLBACK_URL');

    if (!issuer || !clientId || !clientSecret || !callbackUrl) {
      throw new GoogleAuthError(
        'configuracion_invalida',
        'La autenticación con Google no está configurada en el servidor',
      );
    }

    try {
      return await discovery(
        new URL(issuer),
        clientId,
        {
          client_secret: clientSecret,
          redirect_uris: [callbackUrl],
        },
        ClientSecretPost(clientSecret),
      );
    } catch (error) {
      throw new GoogleAuthError(
        'proveedor_no_disponible',
        'No fue posible obtener los metadatos de OpenID Connect de Google',
        error,
      );
    }
  }

  private traducirError(error: unknown): GoogleAuthError {
    if (error instanceof GoogleAuthError) {
      return error;
    }

    if (
      error instanceof AuthorizationResponseError ||
      error instanceof ResponseBodyError
    ) {
      return new GoogleAuthError(
        'error_proveedor',
        'Google no autorizó la solicitud de autenticación',
        error,
      );
    }

    return new GoogleAuthError(
      'proveedor_no_disponible',
      'No fue posible completar la autenticación con Google',
      error,
    );
  }
}
