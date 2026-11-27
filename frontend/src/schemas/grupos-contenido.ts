export type IdGrupoContenido =
  | 'inicio'
  | 'cifras'
  | 'nosotros'
  | 'programa'
  | 'resultados'
  | 'colaborar'
  | 'donar'
  | 'contactos'
  | 'otros';

/**
 * Mismo orden que la página pública. `pilares_` va antes que `pilar_`
 * porque el prefijo corto también coincidiría con el encabezado de pilares.
 */
const REGLAS: readonly { id: IdGrupoContenido; prefijo: string }[] = [
  { id: 'inicio', prefijo: 'hero_' },
  { id: 'cifras', prefijo: 'estadistica_' },
  { id: 'nosotros', prefijo: 'quienes_somos_' },
  { id: 'nosotros', prefijo: 'pilares_' },
  { id: 'nosotros', prefijo: 'pilar_' },
  { id: 'programa', prefijo: 'programa_' },
  { id: 'programa', prefijo: 'financiamiento_' },
  { id: 'resultados', prefijo: 'resultados_' },
  { id: 'colaborar', prefijo: 'colaborar_' },
  { id: 'donar', prefijo: 'donaciones_' },
  { id: 'contactos', prefijo: 'contacto_' },
];

const ORDEN: readonly IdGrupoContenido[] = [
  'inicio',
  'cifras',
  'nosotros',
  'programa',
  'resultados',
  'colaborar',
  'donar',
  'contactos',
  'otros',
];

export function idGrupoContenido(clave: string): IdGrupoContenido {
  return REGLAS.find((regla) => clave.startsWith(regla.prefijo))?.id ?? 'otros';
}

export function agruparBloques<T extends { clave: string; orden: number }>(
  bloques: readonly T[],
): { id: IdGrupoContenido; bloques: T[] }[] {
  const porId = new Map<IdGrupoContenido, T[]>();
  for (const bloque of bloques) {
    const id = idGrupoContenido(bloque.clave);
    const lista = porId.get(id) ?? [];
    lista.push(bloque);
    porId.set(id, lista);
  }
  return ORDEN.filter((id) => porId.has(id)).map((id) => ({
    id,
    bloques: [...(porId.get(id) ?? [])].sort(
      (a, b) => a.orden - b.orden || a.clave.localeCompare(b.clave),
    ),
  }));
}
