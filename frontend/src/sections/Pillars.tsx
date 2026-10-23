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
    <div>
      <SectionHeader title={t('pillars.title')} subtitle={t('pillars.subtitle')} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <Card
            key={pillar.title}
            radius="card"
            className="flex h-full flex-col items-center p-6 text-center lg:p-8"
          >
            <Photo
              src={pillar.image}
              alt={pillar.alt}
              radius="full"
              width={144}
              height={144}
              className="mb-6 h-36 w-36"
            />
            <h3 className="mb-4 t-heading-card text-negro">{pillar.title}</h3>
            <p className="t-body text-negro">{pillar.text}</p>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-20 flex max-w-[880px] items-start gap-4">
        <FlameIcon className="mt-1 h-9 w-9 shrink-0" />
        <p className="t-body-lg text-negro">{t('pillars.future_text')}</p>
      </div>
    </div>
  );
}
