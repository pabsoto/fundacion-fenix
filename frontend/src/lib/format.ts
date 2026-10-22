export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-BO').format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(value);
}
