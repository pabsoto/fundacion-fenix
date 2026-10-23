import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignList } from './CampaignList';
import { CampaignDetail } from './CampaignDetail';

const DEFAULT_YEAR = 2024;
const DEFAULT_ID = 'distrito-4-2024';

export function Campaigns() {
  const { t } = useTranslation();
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_ID);
  const [expanded, setExpanded] = useState(false);

  const { data: campaigns = [] } = useCampaigns(year);

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
          <p className="t-stat text-naranja">{t('campaigns.accumulated')}</p>
          <p className="t-small text-negro">{t('campaigns.accumulated_label')}</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <CampaignList
          campaigns={campaigns}
          year={year}
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
      </div>
    </div>
  );
}
