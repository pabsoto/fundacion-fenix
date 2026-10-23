import { useTranslation } from 'react-i18next';
import { Syringe } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Photo } from '@/components/ui/Photo';
import { SafeRichText } from '@/components/ui/SafeRichText';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';

export function Program() {
  const { t } = useTranslation();
  const { text } = useInstitutionalContent();

  return (
    <div className="grid items-center gap-10 rounded-panel bg-naranja p-6 text-negro lg:grid-cols-2 lg:gap-16 lg:p-16">
      <div className="flex flex-col gap-6">
        <Chip variant="solid-crema">{t('program.chip')}</Chip>
        <h2 className="t-section text-blanco">{text('programa_encabezado', 'titulo')}</h2>
        <p className="t-heading-lg text-blanco">{text('programa_encabezado')}</p>
        <p className="t-body-lg text-blanco">{text('programa_intro')}</p>
        <p className="t-body-lg text-blanco">
          <SafeRichText text={text('programa_alcance')} />
        </p>
        <div className="rounded-card bg-crema px-6 py-5">
          <p className="t-heading-card text-negro">{text('programa_igualdad')}</p>
        </div>
        <p className="t-body-lg text-blanco">{text('programa_comunidades')}</p>
      </div>

      <div className="relative mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
        <Photo
          src="/images/programa-por-menos-de-ellos-sufriendo.jpg"
          alt={t('program.photo_alt')}
          radius="panel"
          width={460}
          height={640}
          className="aspect-[460/640] h-auto w-full"
        />
        <div className="absolute bottom-6 left-4 flex items-center gap-3.5 rounded-card bg-blanco py-4 pl-4 pr-6 shadow-lift">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amarillo">
            <Syringe className="h-6 w-6 text-negro" aria-hidden />
          </div>
          <div>
            <p className="t-heading-card text-negro">{text('programa_gratuidad', 'titulo')}</p>
            <p className="t-body text-negro">{text('programa_gratuidad')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
