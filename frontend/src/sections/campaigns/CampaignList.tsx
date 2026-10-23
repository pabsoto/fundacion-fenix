import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatCampaignLabel, formatNumber } from '@/lib/format';
import type { Campaign } from '@/types';

const YEARS = [2025, 2024, 2023] as const;
const PAGE_SIZE = 5;

interface CampaignListProps {
  campaigns: Campaign[];
  year: number;
  selectedId: string | null;
  expanded: boolean;
  onYearChange: (year: number) => void;
  onSelect: (id: string) => void;
  onExpand: () => void;
}

export function CampaignList({
  campaigns,
  year,
  selectedId,
  expanded,
  onYearChange,
  onSelect,
  onExpand,
}: CampaignListProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const visible = expanded ? campaigns : campaigns.slice(0, PAGE_SIZE);
  const remaining = Math.max(0, campaigns.length - PAGE_SIZE);

  return (
    <div className="flex w-full flex-col gap-4 lg:w-[400px] lg:shrink-0">
      <div className="flex flex-col items-center gap-1.5 rounded-card bg-blanco p-6 text-center shadow-soft">
        <p className="t-heading-card text-negro">{t('campaigns.list_title')}</p>
        <p className="t-small text-negro">{t('campaigns.list_hint')}</p>
        <div
          className="flex gap-2 pt-2"
          role="group"
          aria-label={t('campaigns.years_label')}
        >
          {YEARS.map((y) => {
            const active = y === year;
            return (
              <button
                key={y}
                type="button"
                aria-pressed={active}
                onClick={() => onYearChange(y)}
                className={cn(
                  'min-h-11 rounded-btn border px-5 py-2 t-nav transition-colors',
                  active
                    ? 'border-negro bg-negro text-crema'
                    : 'border-linea bg-blanco text-negro'
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <p className="t-body text-center text-negro">{t('campaigns.empty_year')}</p>
      ) : (
        <ul
          className="flex flex-col gap-3"
          role="listbox"
          aria-label={t('campaigns.list_label')}
        >
          {visible.map((campaign, index) => {
            const selected = campaign.id === selectedId;
            const placeTitle = t('campaigns.place', {
              place: campaign.place,
              city: campaign.city,
            });
            const order = String(index + 1).padStart(2, '0');

            return (
              <li key={campaign.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(campaign.id)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3.5 rounded-card py-3 pl-4 pr-5 text-left text-negro transition-colors',
                    selected
                      ? 'border-[1.5px] border-negro bg-naranja'
                      : 'bg-blanco shadow-soft'
                  )}
                >
                  <span className="t-small w-6 shrink-0">{order}</span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body-strong block truncate">{placeTitle}</span>
                    <span className="t-small block">
                      {formatCampaignLabel(campaign.year, campaign.months, lang)}
                    </span>
                  </span>
                  {selected ? (
                    <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                  ) : (
                    <span className="t-body-strong shrink-0">
                      {formatNumber(campaign.total, lang)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!expanded && remaining > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full"
          onClick={onExpand}
        >
          {remaining === 1
            ? t('campaigns.see_remaining_one')
            : t('campaigns.see_remaining', { count: remaining })}
        </Button>
      )}
    </div>
  );
}
