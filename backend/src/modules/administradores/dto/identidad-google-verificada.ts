/**
 * Identidad de Google verificada criptográficamente contra las claves
 * oficiales de Google.
 *
 * Es la única fuente aceptada por el backend para autorizar a un
 * administrador: nunca se acepta un correo o un `google_sub` enviado por el
 * frontend como prueba de identidad.
 */
export interface IdentidadGoogleVerificada {
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name?: string;
}
