/** Minúsculas y sin tildes. La misma regla que usa el backend para `q`. */
export function normalizarBusqueda(valor: string): string {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
}

/** Todas las palabras deben aparecer. Vacío no filtra. */
export function coincideBusqueda(texto: string, consulta: string | undefined): boolean {
  const terminos = normalizarBusqueda(consulta ?? '')
    .split(/\s+/)
    .filter((termino) => termino.length > 0);
  if (terminos.length === 0) return true;
  const plano = normalizarBusqueda(texto);
  return terminos.every((termino) => plano.includes(termino));
}
