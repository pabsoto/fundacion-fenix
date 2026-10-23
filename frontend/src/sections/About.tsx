import { useTranslation } from 'react-i18next';
import { Photo } from '@/components/ui/Photo';
import { Pill } from '@/components/ui/Pill';
import { FlameIcon } from '@/components/ui/icons';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';

export function About() {
  const { t } = useTranslation();
  const { text } = useInstitutionalContent();

  return (
    <div className="flex flex-col gap-16 lg:gap-20">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className="relative">
          <Photo
            src="/images/fundadora-con-perrito.jpg"
            alt={t('about.founder_alt')}
            radius="panel"
            width={520}
            height={560}
            className="h-auto w-full"
          />
          <div className="absolute bottom-4 left-4">
            <Pill>{text('quienes_somos_fundadora', 'titulo')}</Pill>
          </div>
        </div>

        <div className="space-y-6">
          <p className="t-eyebrow text-negro">{text('quienes_somos_encabezado')}</p>
          <h2 className="t-section text-negro">{text('quienes_somos_encabezado', 'titulo')}</h2>
          <p className="t-heading-md text-negro">{text('quienes_somos_intro', 'titulo')}</p>
          <p className="t-body-lg text-negro">{text('quienes_somos_intro')}</p>
        </div>
      </div>

      <div className="grid items-center gap-8 rounded-panel bg-amarillo p-6 lg:grid-cols-2 lg:gap-12 lg:p-14">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <FlameIcon className="h-10 w-10" />
            <p className="t-eyebrow text-negro">{text('quienes_somos_fenix', 'titulo')}</p>
          </div>
          <p className="t-heading-md text-negro">{text('quienes_somos_fenix')}</p>
        </div>

        <div className="lg:ml-auto">
          <Photo
            src="/images/gatito-rescatado.jpg"
            alt={t('about.kitten_alt')}
            radius="panel"
            width={360}
            height={440}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
