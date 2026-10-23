export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-BO', { useGrouping: 'always' }).format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(value);
}

export function speciesShare(part: number, total: number): string {
  if (total === 0) return formatPercent(0);
  return formatPercent((part / total) * 100);
}
