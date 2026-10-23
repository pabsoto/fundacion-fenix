function resolveLocale(lang?: string) {
  const code = (lang || 'es').split('-')[0];
  return code === 'en' ? 'en-US' : 'es-BO';
}

export function formatNumber(value: number, lang?: string): string {
  return new Intl.NumberFormat(resolveLocale(lang), { useGrouping: 'always' }).format(value);
}

export function formatPercent(value: number, lang?: string): string {
  return `${new Intl.NumberFormat(resolveLocale(lang), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function formatCurrency(value: number, lang?: string): string {
  return new Intl.NumberFormat(resolveLocale(lang), {
    style: 'currency',
    currency: 'BOB',
  }).format(value);
}

export function speciesShare(part: number, total: number, lang?: string): string {
  if (total === 0) return formatPercent(0, lang);
  return formatPercent((part / total) * 100, lang);
}

export function formatCampaignLabel(year: number, months: number[], lang?: string): string {
  const locale = resolveLocale(lang);
  const names = months.map((month) => {
    const raw = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
      new Date(year, month - 1, 1),
    );
    const clean = raw.replace('.', '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  });
  if (names.length === 1) return `${names[0]} ${year}`;
  return `${names[0]} – ${names[names.length - 1]} ${year}`;
}
