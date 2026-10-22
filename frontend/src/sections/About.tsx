import { useTranslation } from 'react-i18next';
import { Photo } from '@/components/ui/Photo';
import { Pill } from '@/components/ui/Pill';
import { FlameIcon } from '@/components/ui/icons';

export function About() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
      {/* Main content row */}
      <div className="grid lg:grid-cols-2 gap-20 items-center mb-16">
        {/* Left: Founder photo */}
        <div className="relative">
          <Photo
            src="/images/fundadora-con-perrito.jpg"
            alt={t('about.founder_alt')}
            radius="panel"
            className="w-full h-auto"
          />
          <div className="absolute bottom-4 left-4">
            <Pill>{t('about.founder_pill')}</Pill>
          </div>
        </div>

        {/* Right: Text content */}
        <div>
          <p className="t-eyebrow text-negro mb-3">{t('about.eyebrow')}</p>
          <h2 className="t-section text-negro mb-4">{t('about.title')}</h2>
          <p className="t-heading-md text-negro mb-4">{t('about.lead')}</p>
          <p className="t-body-lg text-negro">{t('about.text')}</p>
        </div>
      </div>

      {/* Yellow panel */}
      <div className="bg-amarillo rounded-panel p-14 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Flame icon + text */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <FlameIcon className="h-10 w-10" />
            <p className="t-eyebrow text-negro">{t('about.phoenix_eyebrow')}</p>
          </div>
          <p className="t-heading-md text-negro">{t('about.phoenix_text')}</p>
        </div>

        {/* Right: Kitten photo */}
        <div className="lg:ml-auto">
          <Photo
            src="/images/gatito-rescatado.jpg"
            alt={t('about.kitten_alt')}
            radius="panel"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}

