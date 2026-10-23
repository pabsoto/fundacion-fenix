import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { SECTION_IDS } from '@/lib/constants';

export function Financing() {
  const { t } = useTranslation();

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Photo
        src="/images/jornada-en-comunidad.jpg"
        alt={t('financing.photo_alt')}
        radius="panel"
        className="mx-auto aspect-[520/600] h-auto w-full max-w-[520px] lg:mx-0"
      />

      <div className="flex flex-col gap-6">
        <h3 className="t-heading-lg text-negro">{t('financing.title')}</h3>
        <p className="t-body-lg text-negro">
          <Trans i18nKey="financing.paragraph1" components={{ strong: <strong /> }} />
        </p>
        <p className="t-body-lg text-negro">{t('financing.paragraph2')}</p>
        <p className="t-body-lg text-negro">
          <Trans i18nKey="financing.paragraph3" components={{ strong: <strong /> }} />
        </p>
        <div>
          <Button href={`#${SECTION_IDS.donate}`} variant="primary" size="lg">
            {t('financing.donar_ahora')}
          </Button>
        </div>
      </div>
    </div>
  );
}
