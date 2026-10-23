import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignList } from './CampaignList';
import { CampaignDetail } from './CampaignDetail';
import { useStats } from '@/hooks/useStats';
import { formatNumber } from '@/lib/format';

const CURRENT_YEAR = new Date().getFullYear();

export function Campaigns() {
  const { t, i18n } = useTranslation();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { data: allCampaigns = [], isPending, isError } = useCampaigns();
  const years = useMemo(() => {
    const officialYears = [...new Set(allCampaigns.map((campaign) => campaign.year))]
      .sort((a, b) => b - a);
    return officialYears.length > 0
      ? officialYears
      : [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
  }, [allCampaigns]);
  const effectiveYear = years.includes(year) ? year : years[0];
  const campaigns = allCampaigns.filter((campaign) => campaign.year === effectiveYear);
  const { data: stats } = useStats();
  const accumulated = (stats?.caninos.total ?? 0) + (stats?.felinos.total ?? 0);

  const selected =
    campaigns.find((c) => c.id === selectedId) ?? campaigns[0] ?? null;

  function handleYearChange(next: number) {
    setYear(next);
    setExpanded(false);
    setSelectedId(null);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-3">
          <h2 className="t-section text-negro">{t('campaigns.title')}</h2>
          <p className="t-body-lg text-negro">{t('campaigns.subtitle')}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card bg-blanco px-9 py-5 shadow-soft">
          <p className="t-stat text-naranja">{formatNumber(accumulated, i18n.resolvedLanguage)}</p>
          <p className="t-small text-negro">{t('campaigns.accumulated_label')}</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <CampaignList
          campaigns={campaigns}
          years={years}
          year={effectiveYear}
          selectedId={selected?.id ?? null}
          expanded={expanded}
          onYearChange={handleYearChange}
          onSelect={handleSelect}
          onExpand={() => setExpanded(true)}
        />
        {selected && (
          <div className="min-w-0 flex-1">
            <CampaignDetail campaign={selected} />
          </div>
        )}
        {(isPending || isError) && (
          <p className="t-body text-negro" role="status">
            {isPending ? t('campaigns.loading') : t('campaigns.error')}
          </p>
        )}
      </div>
    </div>
  );
}
