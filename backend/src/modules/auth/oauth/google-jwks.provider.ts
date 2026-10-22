import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

export const PROVEEDOR_CLAVES_GOOGLE = 'PROVEEDOR_CLAVES_GOOGLE';

/**
 * Abstracción del origen de las claves públicas de Google. Permite sustituir
 * el JWKS remoto por un conjunto local durante las pruebas, sin llamadas
 * reales a Google.
 */
export interface ProveedorClavesGoogle {
  obtenerResolver(): JWTVerifyGetKey;
}

/**
 * Proveedor por defecto: descarga el JWKS oficial de Google
 * (`https://www.googleapis.com/oauth2/v3/certs`) y lo cachea internamente.
 */
@Injectable()
export class ProveedorClavesGoogleRemoto implements ProveedorClavesGoogle {
  private resolver: JWTVerifyGetKey | undefined;

  constructor(private readonly config: ConfigService) {}

  obtenerResolver(): JWTVerifyGetKey {
    this.resolver ??= createRemoteJWKSet(
      new URL(this.config.getOrThrow<string>('GOOGLE_OAUTH_JWKS_URI')),
    );

    return this.resolver;
  }
}
