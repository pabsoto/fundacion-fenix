import { textosAdmin } from '@/content/textos-admin';

/** Límites y formato de `ActualizarCanalDto`. */
export const MAX_URL_CANAL = 500;
export const MAX_TEXTO_CANAL = 200;
const ENLACE = /^(https:\/\/|mailto:)\S+$/i;

export type BorradorCanal = {
  url: string;
  textoEs: string;
};

export type ErroresCanal = {
  url?: string;
  textoEs?: string;
};

/**
 * Misma regla que el DTO del backend: enlace obligatorio, https:// o mailto:.
 * El formulario antiguo de solo Facebook sigue usando `isValidFacebookPageUrl`.
 */
export function validarCanal(borrador: BorradorCanal): ErroresCanal | null {
  const textos = textosAdmin.contenido;
  const errores: ErroresCanal = {};
  const url = borrador.url.trim();
  if (!url) errores.url = textosAdmin.supuestos.obligatorio;
  else if (url.length > MAX_URL_CANAL) errores.url = textos.enlaceLargo;
  else if (!ENLACE.test(url)) errores.url = textos.enlaceInvalido;

  const texto = borrador.textoEs.trim();
  if (texto.length > MAX_TEXTO_CANAL) errores.textoEs = textos.textoVisibleLargo;

  return errores.url || errores.textoEs ? errores : null;
}

export function textoVisibleCanal(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}
