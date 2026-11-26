const MAXIMO_DE_CAUSAS = 5;

/**
 * Traza de un error y de su cadena de causas (`cause`), lista para el log.
 *
 * Sólo usa el stack: nunca serializa el objeto de error, porque errores como
 * los de TypeORM llevan la consulta SQL y sus parámetros en propiedades.
 */
export function trazaDeError(error: unknown): string {
  const trazas: string[] = [];
  let actual = error;

  while (actual instanceof Error && trazas.length < MAXIMO_DE_CAUSAS) {
    trazas.push(actual.stack ?? `${actual.name}: ${actual.message}`);
    actual = actual.cause;
  }

  // Un valor lanzado que no es `Error` sólo se describe si es texto; de una
  // causa anidada de ese tipo no se registra nada.
  if (trazas.length === 0) {
    return typeof error === 'string'
      ? error
      : `Error no estándar de tipo ${typeof error}`;
  }

  return trazas.join('\nCausado por: ');
}
