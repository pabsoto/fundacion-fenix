export class AdministradorAutenticadoDto {
  id: string;
  nombre: string;
}

/**
 * Resultado interno del flujo de Google OAuth tras validar la identidad.
 *
 * `estado: 'autorizado'` significa que la identidad de Google está verificada
 * y que la cuenta administrativa existe, está activa y tiene la identidad
 * vinculada. La creación de la sesión de aplicación y el establecimiento de la
 * cookie se realizan en la capa HTTP, tras este resultado.
 */
export class ResultadoAutenticacionDto {
  estado: 'autorizado';
  mensaje: string;
  sesion: { creada: false };
  administrador: AdministradorAutenticadoDto;
}
