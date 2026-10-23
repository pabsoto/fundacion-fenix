import { useTranslation } from 'react-i18next';
import { DonutChart } from '@/components/ui/DonutChart';
import { PawIcon } from '@/components/ui/icons';
import { formatNumber, speciesShare } from '@/lib/format';
import { useStats } from '@/hooks/useStats';
import type { SpeciesStats } from '@/types';

function SpeciesCard({
  stats,
  name,
  centerLabel,
  iconBg,
}: {
  stats: SpeciesStats;
  name: string;
  centerLabel: string;
  iconBg: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const malesPct = speciesShare(stats.males, stats.total, lang);
  const femalesPct = speciesShare(stats.females, stats.total, lang);

  return (
    <div className="flex h-full flex-col items-center gap-6 rounded-panel border border-linea bg-blanco p-8">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}
          >
            <PawIcon className="h-[22px] w-[22px] text-negro" />
          </div>
          <p className="t-heading-card text-negro">{name}</p>
        </div>
        <p className="t-body-strong shrink-0 text-negro">
          {t('results.total_prefix', { count: formatNumber(stats.total, lang) })}
        </p>
      </div>

      <DonutChart
        total={stats.total}
        males={stats.males}
        females={stats.females}
        centerLabel={centerLabel}
        ariaLabel={t('results.donut_aria', {
          name,
          total: formatNumber(stats.total, lang),
          males: formatNumber(stats.males, lang),
          females: formatNumber(stats.females, lang),
          malesPct,
          femalesPct,
        })}
      />

      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="size-4 rounded-full bg-naranja" aria-hidden />
            <span className="t-body-strong text-negro">{t('results.males')}</span>
          </div>
          <span className="t-body text-negro">
            {formatNumber(stats.males, lang)} ({malesPct})
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="size-4 rounded-full bg-amarillo" aria-hidden />
            <span className="t-body-strong text-negro">{t('results.females')}</span>
          </div>
          <span className="t-body text-negro">
            {formatNumber(stats.females, lang)} ({femalesPct})
          </span>
        </div>
      </div>
    </div>
  );
}

export function ResultsOverview() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { data: stats, isPending, isError } = useStats();

  if (!stats) {
    return (
      <p className="t-body text-center text-negro" role="status">
        {isPending ? t('results.loading') : isError ? t('results.error') : t('results.empty')}
      </p>
    );
  }

  const grandTotal = stats.caninos.total + stats.felinos.total;

  return (
    <div className="flex flex-col gap-12">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col justify-center gap-3 rounded-panel border border-linea bg-blanco p-6 lg:p-8 md:col-span-2 lg:col-span-1">
          <p className="t-eyebrow text-negro">{t('results.total_eyebrow')}</p>
          <p className="t-stat-xl text-naranja">{formatNumber(grandTotal, lang)}</p>
          <p className="t-heading-md text-negro">{t('results.surgeries')}</p>
          <p className="t-body text-negro">
            {t('results.species_breakdown', {
              dogs: formatNumber(stats.caninos.total, lang),
              cats: formatNumber(stats.felinos.total, lang),
            })}
          </p>
        </div>

        <SpeciesCard
          stats={stats.caninos}
          name={t('results.caninos')}
          centerLabel={t('results.caninos_center')}
          iconBg="bg-amarillo"
        />
        <SpeciesCard
          stats={stats.felinos}
          name={t('results.felinos')}
          centerLabel={t('results.felinos_center')}
          iconBg="bg-naranja-hover"
        />
      </div>

      {grandTotal === 0 && (
        <p className="t-body text-center text-negro" role="status">
          {t('results.empty')}
        </p>
      )}
    </div>
  );
}
