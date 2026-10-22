import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Compara dos cadenas en tiempo constante. Se aplica un hash SHA-256 a ambas
 * para poder usar `timingSafeEqual` incluso cuando las longitudes difieren.
 */
export function comparacionSegura(valorA: string, valorB: string): boolean {
  const resumenA = createHash('sha256').update(valorA, 'utf8').digest();
  const resumenB = createHash('sha256').update(valorB, 'utf8').digest();

  return timingSafeEqual(resumenA, resumenB);
}
