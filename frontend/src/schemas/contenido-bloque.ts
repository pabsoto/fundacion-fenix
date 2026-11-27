import { textosAdmin } from '@/content/textos-admin';

/** Límites de `ActualizarContenidoDto`. */
export const MAX_TITULO_CONTENIDO = 300;
export const MAX_TEXTO_CONTENIDO = 4_000;

/**
 * Bloques cuya foto usa la landing (`image(clave)`), aunque la fila aún no
 * tenga `imagenUrl`. El resto no muestra reemplazo de imagen.
 */
const CLAVES_CON_IMAGEN = new Set([
  'hero_principal',
  'quienes_somos_fundadora',
  'quienes_somos_fenix',
  'pilar_rehabilitacion',
  'pilar_educacion',
  'pilar_esterilizacion',
  'programa_encabezado',
  'financiamiento_intro',
]);

export type BorradorBloque = {
  tituloEs: string;
  tituloEn: string;
  textoEs: string;
  textoEn: string;
  visible: boolean;
};

export type ErroresBloque = Partial<
  Record<'tituloEs' | 'tituloEn' | 'textoEs' | 'textoEn', string>
>;

export function bloqueMuestraImagen(bloque: {
  clave: string;
  imagenUrl: string | null;
}): boolean {
  return bloque.imagenUrl != null || CLAVES_CON_IMAGEN.has(bloque.clave);
}

/** Nombre visible: el título en español guardado, o la clave si no hay título. */
export function nombreBloque(bloque: { clave: string; tituloEs: string | null }): string {
  const linea = bloque.tituloEs?.split('\n')[0]?.trim();
  return linea || bloque.clave;
}

function campo(valor: string, maximo: number, largo: string): string | undefined {
  const limpio = valor.trim();
  if (!limpio) return textosAdmin.supuestos.obligatorio;
  if (limpio.length > maximo) return largo;
  return undefined;
}

export function validarBloque(borrador: BorradorBloque): ErroresBloque | null {
  const textos = textosAdmin.contenido;
  const errores: ErroresBloque = {};
  const tituloEs = campo(borrador.tituloEs, MAX_TITULO_CONTENIDO, textos.tituloLargo);
  const tituloEn = campo(borrador.tituloEn, MAX_TITULO_CONTENIDO, textos.tituloLargo);
  const textoEs = campo(borrador.textoEs, MAX_TEXTO_CONTENIDO, textos.textoLargo);
  const textoEn = campo(borrador.textoEn, MAX_TEXTO_CONTENIDO, textos.textoLargo);
  if (tituloEs) errores.tituloEs = tituloEs;
  if (tituloEn) errores.tituloEn = tituloEn;
  if (textoEs) errores.textoEs = textoEs;
  if (textoEn) errores.textoEn = textoEn;
  return Object.keys(errores).length > 0 ? errores : null;
}
