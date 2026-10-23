import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { formatNumber } from '@/lib/format';
import { SECTION_IDS } from '@/lib/constants';
import type { Campaign } from '@/types';

interface CampaignDetailProps {
  campaign: Campaign;
}

export function CampaignDetail({ campaign }: CampaignDetailProps) {
  const { t } = useTranslation();
  const placeTitle = t('campaigns.place', {
    place: campaign.place,
    city: campaign.city,
  });
  const photoSlots = [0, 1, 2];

  return (
    <div className="flex w-full flex-col items-start">
      <div className="rounded-t-btn bg-naranja px-6 py-2.5">
        <p className="t-body-strong text-negro">{campaign.label}</p>
      </div>

      <div className="w-full rounded-bl-panel rounded-br-panel rounded-tr-panel rounded-tl-btn bg-blanco p-8 shadow-lift">
        <div className="pb-5">
          <h3 className="t-heading-md text-negro">{placeTitle}</h3>
        </div>

        <div className="flex items-center gap-6 border-t border-linea py-5">
          <p className="t-body-strong w-[168px] shrink-0 text-negro">
            {t('campaigns.total_label')}
          </p>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="t-stat text-naranja">{formatNumber(campaign.total)}</span>
            <span className="t-body-lg text-negro">{t('campaigns.sterilizations')}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 border-t border-linea py-5">
          <p className="t-body-strong w-[168px] shrink-0 text-negro">
            {t('campaigns.dogs_cats')}
          </p>
          <p className="t-body-lg text-negro">
            {t('campaigns.dogs_cats_value', {
              dogs: formatNumber(campaign.dogs),
              cats: formatNumber(campaign.cats),
            })}
          </p>
        </div>

        <div className="flex items-center gap-6 border-t border-linea py-5">
          <p className="t-body-strong w-[168px] shrink-0 text-negro">
            {t('campaigns.males_females')}
          </p>
          <p className="t-body-lg text-negro">
            {t('campaigns.males_females_value', {
              males: formatNumber(campaign.males),
              females: formatNumber(campaign.females),
            })}
          </p>
        </div>

        <div className="flex items-start gap-6 border-t border-linea py-5">
          <p className="t-body-strong w-[168px] shrink-0 text-negro">
            {t('campaigns.photos_label')}
          </p>
          <div className="flex min-w-0 flex-1 gap-3">
            {photoSlots.map((i) => {
              const src = campaign.photos[i];
              if (src) {
                return (
                  <Photo
                    key={i}
                    src={src}
                    alt={`${placeTitle} ${i + 1}`}
                    radius="card"
                    className="h-24 min-w-0 flex-1 object-cover"
                  />
                );
              }
              return (
                <div
                  key={i}
                  className="flex h-24 min-w-0 flex-1 items-center justify-center rounded-card bg-linea"
                >
                  <span className="t-nav text-negro">{t('campaigns.photo_placeholder')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-5">
          <div className="flex flex-col items-start gap-4 rounded-card bg-amarillo p-6">
            <p className="t-body text-negro">
              <Trans
                i18nKey="campaigns.sponsor_note"
                components={{ strong: <strong className="t-body-strong" /> }}
              />
            </p>
            <Button href={`#${SECTION_IDS.donate}`} variant="dark" size="md">
              {t('campaigns.go_donate')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
