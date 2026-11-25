const CON_ACENTO = 'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ';
const SIN_ACENTO = 'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun';

/** Minúsculas y sin tildes, para comparar en PostgreSQL sin la extensión unaccent. */
export function expresionBusqueda(textoSql: string): string {
  return `lower(translate(${textoSql}, '${CON_ACENTO}', '${SIN_ACENTO}'))`;
}

function terminosDe(q: string | undefined): string[] {
  if (!q) return [];
  return q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .filter((termino) => termino.length > 0);
}

/** Cada palabra debe aparecer (AND). No altera la consulta si `q` viene vacío. */
export function aplicarBusqueda(
  qb: { andWhere(condicion: string, parametros?: Record<string, string>): unknown },
  expresion: string,
  q: string | undefined,
): void {
  terminosDe(q).forEach((termino, indice) => {
    qb.andWhere(`strpos(${expresion}, :q${indice}) > 0`, {
      [`q${indice}`]: termino,
    });
  });
}
