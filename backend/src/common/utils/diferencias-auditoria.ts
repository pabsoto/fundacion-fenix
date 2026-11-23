/**
 * Devuelve los nombres de los campos cuyo valor cambió entre dos snapshots.
 * Ignora `id` y compara fechas por su valor.
 */
export function camposModificados(
  antes: Record<string, unknown>,
  despues: Record<string, unknown>,
): string[] {
  const valor = (dato: unknown): unknown =>
    dato instanceof Date ? dato.getTime() : dato;
  return Object.keys(despues).filter(
    (campo) => campo !== 'id' && valor(antes[campo]) !== valor(despues[campo]),
  );
}
