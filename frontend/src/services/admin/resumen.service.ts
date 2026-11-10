import { RESUMEN_EJEMPLO } from '@/services/admin/datos-ejemplo';
import { esperarMock } from '@/services/admin/latencia';
import type { Resumen } from '@/types/admin';

// TODO(backend): no existe GET /api/admin/resumen. Las cifras de campañas están en /api/admin/campanas/cifras.
export async function getResumen(): Promise<Resumen> {
  await esperarMock();
  return structuredClone(RESUMEN_EJEMPLO);
}
