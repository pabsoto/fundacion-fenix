import { useTranslation } from 'react-i18next';
import { ArrowRight, Heart, Home, Syringe } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SECTION_IDS, WHATSAPP_URL } from '@/lib/constants';

const cardClass =
  'group flex h-full flex-col gap-4 rounded-card border border-linea bg-blanco p-8 text-left text-negro transition-colors hover:border-[1.5px] hover:border-negro hover:bg-amarillo focus-visible:border-[1.5px] focus-visible:border-negro focus-visible:bg-amarillo';

const iconWrapClass =
  'flex h-14 w-14 items-center justify-center rounded-full bg-amarillo transition-colors group-hover:bg-crema group-focus-visible:bg-crema';

export function Collaborate() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-12">
      <SectionHeader
        title={t('collaborate.title')}
        subtitle={t('collaborate.subtitle')}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
        <a href={`#${SECTION_IDS.donate}`} className={cardClass}>
          <div className={iconWrapClass}>
            <Heart className="h-7 w-7 text-negro" aria-hidden />
          </div>
          <h3 className="t-heading-card text-negro">{t('collaborate.donate_title')}</h3>
          <p className="t-body flex-1 text-negro">{t('collaborate.donate_text')}</p>
          <span className="t-body-strong inline-flex items-center gap-2 underline underline-offset-2">
            {t('collaborate.donate_cta')}
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          </span>
        </a>

        <a href={`#${SECTION_IDS.donate}`} className={cardClass}>
          <div className={iconWrapClass}>
            <Syringe className="h-7 w-7 text-negro" aria-hidden />
          </div>
          <h3 className="t-heading-card text-negro">{t('collaborate.sponsor_title')}</h3>
          <p className="t-body flex-1 text-negro">{t('collaborate.sponsor_text')}</p>
          <span className="t-body-strong inline-flex items-center gap-2 underline underline-offset-2">
            {t('collaborate.sponsor_cta')}
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          </span>
        </a>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cardClass}
        >
          <div className={iconWrapClass}>
            <Home className="h-7 w-7 text-negro" aria-hidden />
          </div>
          <h3 className="t-heading-card text-negro">{t('collaborate.adopt_title')}</h3>
          <p className="t-body flex-1 text-negro">{t('collaborate.adopt_text')}</p>
          <span className="t-body-strong inline-flex items-center gap-2 underline underline-offset-2">
            {t('collaborate.adopt_cta')}
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          </span>
        </a>
      </div>
    </div>
  );
}
