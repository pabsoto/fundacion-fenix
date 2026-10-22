import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta de `GET /api/auth/me`.
 *
 * Sólo contiene información mínima del administrador autenticado. Nunca
 * incluye el correo, el `google_sub`, el identificador de sesión ni tokens de
 * Google.
 */
export class AdministradorSesionActualDto {
  @ApiProperty({
    format: 'uuid',
    example: '8e50816a-2d40-4b10-a4bf-103c31dbd9a8',
  })
  readonly id: string;

  @ApiProperty({ example: 'Administradora FÉNIX' })
  readonly nombre: string;
}

export class SesionActualDto {
  @ApiProperty({ example: true })
  readonly autenticado: true;

  @ApiProperty({ type: () => AdministradorSesionActualDto })
  readonly administrador: AdministradorSesionActualDto;
  /**
   * Token anti-CSRF ligado a la sesión. El frontend debe enviarlo en la
   * cabecera `X-CSRF-Token` en todas las operaciones que modifican datos.
   * No es una credencial de autenticación.
   */
  @ApiProperty({
    example: 'r4nd0m-csrf-token',
    description:
      'Token anti-CSRF que debe enviarse como X-CSRF-Token en escrituras.',
  })
  readonly csrfToken: string;
  /** Instante de caducidad máxima absoluta de la sesión (ISO 8601). */
  @ApiProperty({ format: 'date-time', example: '2026-10-22T20:00:00.000Z' })
  readonly expiraEn: string;
}
