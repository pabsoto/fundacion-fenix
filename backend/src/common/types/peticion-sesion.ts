import type { Request } from 'express';
import type { ContextoSesion } from '../../modules/auth/services/sesion-admin.service.js';

/** Datos mínimos del administrador asociados a una sesión válida. */
export interface AdministradorSesion {
  readonly id: string;
  readonly nombre: string;
}

/**
 * Petición HTTP con la sesión administrativa resuelta.
 *
 * Los guards adjuntan el contexto de la sesión y el administrador
 * autenticado para que los controladores no repitan la comprobación.
 */
export interface PeticionConSesion extends Request {
  sesionAdmin?: ContextoSesion;
  csrfTokenSesion?: string;
  administradorSesion?: AdministradorSesion;
}
