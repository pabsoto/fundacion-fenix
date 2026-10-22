import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Códigos internos del flujo de autenticación con Google. Se utilizan para
 * registrar el motivo real del fallo (en el log del servidor) sin exponerlo en
 * la respuesta HTTP.
 */
export type CodigoErrorGoogleAuth =
  | 'configuracion_invalida'
  | 'demasiadas_solicitudes'
  | 'transaccion_no_encontrada'
  | 'transaccion_expirada'
  | 'state_invalido'
  | 'vinculacion_navegador_invalida'
  | 'error_proveedor'
  | 'proveedor_no_disponible'
  | 'token_firma_invalida'
  | 'token_expirado'
  | 'token_audiencia_invalida'
  | 'token_emitente_invalido'
  | 'token_nonce_invalido'
  | 'token_claims_invalidos'
  | 'correo_no_verificado'
  | 'autorizacion_denegada'
  | 'vinculacion_pendiente';

const ESTADOS_POR_CODIGO: Record<CodigoErrorGoogleAuth, HttpStatus> = {
  configuracion_invalida: HttpStatus.SERVICE_UNAVAILABLE,
  demasiadas_solicitudes: HttpStatus.TOO_MANY_REQUESTS,
  transaccion_no_encontrada: HttpStatus.BAD_REQUEST,
  transaccion_expirada: HttpStatus.BAD_REQUEST,
  state_invalido: HttpStatus.BAD_REQUEST,
  vinculacion_navegador_invalida: HttpStatus.BAD_REQUEST,
  error_proveedor: HttpStatus.BAD_REQUEST,
  proveedor_no_disponible: HttpStatus.BAD_GATEWAY,
  token_firma_invalida: HttpStatus.UNAUTHORIZED,
  token_expirado: HttpStatus.UNAUTHORIZED,
  token_audiencia_invalida: HttpStatus.UNAUTHORIZED,
  token_emitente_invalido: HttpStatus.UNAUTHORIZED,
  token_nonce_invalido: HttpStatus.UNAUTHORIZED,
  token_claims_invalidos: HttpStatus.UNAUTHORIZED,
  correo_no_verificado: HttpStatus.UNAUTHORIZED,
  autorizacion_denegada: HttpStatus.UNAUTHORIZED,
  vinculacion_pendiente: HttpStatus.FORBIDDEN,
};

/**
 * Error del flujo de autenticación con Google. Hereda de `HttpException` para
 * que el filtro global de errores produzca una respuesta uniforme, pero el
 * código interno permanece disponible para los registros del servidor y las
 * pruebas.
 */
export class GoogleAuthError extends HttpException {
  constructor(
    readonly codigo: CodigoErrorGoogleAuth,
    message: string,
    cause?: unknown,
  ) {
    super(
      { error: 'Error de autenticación', message },
      ESTADOS_POR_CODIGO[codigo],
      cause === undefined ? undefined : { cause },
    );
    this.name = 'GoogleAuthError';
  }
}
