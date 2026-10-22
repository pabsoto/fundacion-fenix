const HOSTS_LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Resuelve la URI de callback utilizada por la herramienta de vinculación.
 *
 * Por defecto reutiliza `GOOGLE_CALLBACK_URL`, que ya debe estar autorizada
 * en el cliente OAuth. Se permite una URI específica para la CLI, pero nunca
 * fuera de loopback ni con credenciales, query o fragmento.
 */
export function resolverCallbackVinculacion(entorno: NodeJS.ProcessEnv): URL {
  const valor =
    entorno.GOOGLE_LINK_CALLBACK_URL?.trim() ||
    entorno.GOOGLE_CALLBACK_URL?.trim();

  if (!valor) {
    throw new Error(
      'GOOGLE_LINK_CALLBACK_URL o GOOGLE_CALLBACK_URL es obligatoria para vincular una identidad',
    );
  }

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(
      'El callback de vinculación debe ser una URL absoluta válida',
    );
  }

  if (url.protocol !== 'http:' || !HOSTS_LOOPBACK.has(url.hostname)) {
    throw new Error(
      'El callback de vinculación debe utilizar HTTP sobre localhost, 127.0.0.1 o ::1',
    );
  }

  if (!url.port) {
    throw new Error('El callback de vinculación debe indicar un puerto local');
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      'El callback de vinculación no debe contener credenciales, query ni fragmento',
    );
  }

  return url;
}
