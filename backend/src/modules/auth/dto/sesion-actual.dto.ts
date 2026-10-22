/**
 * Respuesta de `GET /api/auth/me`.
 *
 * Sólo contiene información mínima del administrador autenticado. Nunca
 * incluye el correo, el `google_sub`, el identificador de sesión ni tokens de
 * Google.
 */
export interface AdministradorSesionActual {
  readonly id: string;
  readonly nombre: string;
}

export interface SesionActualDto {
  readonly autenticado: true;
  readonly administrador: AdministradorSesionActual;
  /**
   * Token anti-CSRF ligado a la sesión. El frontend debe enviarlo en la
   * cabecera `X-CSRF-Token` en todas las operaciones que modifican datos.
   * No es una credencial de autenticación.
   */
  readonly csrfToken: string;
  /** Instante de caducidad máxima absoluta de la sesión (ISO 8601). */
  readonly expiraEn: string;
}
