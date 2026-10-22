import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Photo } from '@/components/ui/Photo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FlameIcon } from '@/components/ui/icons';

export function Pillars() {
  const { t } = useTranslation();

  const pillars = [
    {
      image: '/images/pilar-rehabilitacion.jpg',
      alt: t('pillars.pilar1_alt'),
      title: t('pillars.pilar1_title'),
      text: t('pillars.pilar1_text'),
    },
    {
      image: '/images/pilar-educacion.jpg',
      alt: t('pillars.pilar2_alt'),
      title: t('pillars.pilar2_title'),
      text: t('pillars.pilar2_text'),
    },
    {
      image: '/images/pilar-esterilizacion.jpg',
      alt: t('pillars.pilar3_alt'),
      title: t('pillars.pilar3_title'),
      text: t('pillars.pilar3_text'),
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
      <SectionHeader
        title={t('pillars.title')}
        subtitle={t('pillars.subtitle')}
      />

      {/* 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
        {pillars.map((pillar, index) => (
          <Card key={index} radius="card" className="p-8 flex flex-col items-center text-center h-full">
            <Photo
              src={pillar.image}
              alt={pillar.alt}
              radius="full"
              className="w-36 h-36 mb-6"
            />
            <h3 className="t-heading-card text-negro mb-4">{pillar.title}</h3>
            <p className="t-body text-negro">{pillar.text}</p>
          </Card>
        ))}
      </div>

      {/* Future statement */}
      <div className="max-w-[880px] mx-auto flex items-start gap-4">
        <FlameIcon className="h-9 w-9 text-naranja-hover flex-shrink-0 mt-1" />
        <p className="t-body-lg text-negro">{t('pillars.future_text')}</p>
      </div>
    </div>
  );
}

