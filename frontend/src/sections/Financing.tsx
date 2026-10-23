import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Photo } from '@/components/ui/Photo';
import { SECTION_IDS } from '@/lib/constants';
import { SafeRichText } from '@/components/ui/SafeRichText';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';

export function Financing() {
  const { t } = useTranslation();
  const { text } = useInstitutionalContent();

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Photo
        src="/images/jornada-en-comunidad.jpg"
        alt={t('financing.photo_alt')}
        radius="panel"
        width={520}
        height={600}
        className="mx-auto aspect-[520/600] h-auto w-full max-w-[520px] lg:mx-0"
      />

      <div className="flex flex-col gap-6">
        <h3 className="t-heading-lg text-negro">{text('financiamiento_intro', 'titulo')}</h3>
        <p className="t-body-lg text-negro">
          <SafeRichText text={text('financiamiento_intro')} />
        </p>
        <p className="t-body-lg text-negro">{text('financiamiento_impacto')}</p>
        <p className="t-body-lg text-negro">
          <SafeRichText text={text('financiamiento_llamado')} />
        </p>
        <div className="mt-8">
          <Button href={`#${SECTION_IDS.donate}`} variant="primary" size="lg">
            {t('financing.donar_ahora')}
          </Button>
        </div>
      </div>
    </div>
  );
}
