import { DEMO_SHOWCASE } from '@/lib/demo';

/**
 * Acciones del panel que el backend todavía no ofrece.
 *
 * Con la API real la interfaz las oculta. Solo existen simuladas (modo demo).
 * Cuando el backend agregue cada endpoint, se pone `true` aquí y se conecta
 * la función correspondiente en `animales.service.ts` o `campanas.service.ts`.
 */
export const capacidadesAdmin = {
  /** Falta PUT /admin/animales/:id */
  editarAnimal: DEMO_SHOWCASE,
  /** Falta DELETE /admin/animales/:id */
  eliminarAnimal: DEMO_SHOWCASE,
  /** Falta DELETE /admin/animales/:id/fotos/:tipo */
  quitarFotoAnimal: DEMO_SHOWCASE,
  /** Falta quitar una foto de campaña. */
  quitarFotoCampana: DEMO_SHOWCASE,
} as const;
