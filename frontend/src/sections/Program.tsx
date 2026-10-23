import { Trans, useTranslation } from 'react-i18next';
import { Syringe } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Photo } from '@/components/ui/Photo';

export function Program() {
  const { t } = useTranslation();

  return (
    <div className="bg-naranja rounded-panel grid items-center gap-10 p-8 text-negro lg:grid-cols-2 lg:gap-16 lg:p-16">
      <div className="flex flex-col gap-6">
        <Chip variant="solid-crema">{t('program.chip')}</Chip>
        <h2 className="t-section text-negro">{t('program.title')}</h2>
        <p className="t-heading-lg text-negro">{t('program.motto')}</p>
        <p className="t-body-lg text-negro">{t('program.paragraph1')}</p>
        <p className="t-body-lg text-negro">
          <Trans i18nKey="program.paragraph2" components={{ strong: <strong /> }} />
        </p>
        <div className="rounded-card bg-crema px-6 py-5">
          <p className="t-heading-card text-negro">{t('program.highlight_box')}</p>
        </div>
        <p className="t-body-lg text-negro">{t('program.paragraph3')}</p>
      </div>

      <div className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
        <Photo
          src="/images/programa-por-menos-de-ellos-sufriendo.jpg"
          alt={t('program.photo_alt')}
          radius="panel"
          className="aspect-[460/640] h-auto w-full"
        />
        <div className="absolute bottom-6 left-4 flex items-center gap-3.5 rounded-card bg-blanco py-4 pl-4 pr-6 shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amarillo">
            <Syringe className="h-6 w-6 text-negro" aria-hidden />
          </div>
          <div>
            <p className="t-heading-card text-negro">{t('program.card_title')}</p>
            <p className="t-body text-negro">{t('program.card_subtitle')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
