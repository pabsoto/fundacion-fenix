import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Pill } from '@/components/ui/Pill';
import { Photo } from '@/components/ui/Photo';
import { PawIcon } from '@/components/ui/icons';
import { SECTION_IDS } from '@/lib/constants';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id={SECTION_IDS.home} className="bg-crema pt-14">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Column */}
          <div className="order-2 lg:order-1">
            <Chip>{t('hero.chip')}</Chip>
            
            <h1 className="mt-6 t-hero text-negro leading-tight">
              {t('hero.title_line1')}
              <br />
              {t('hero.title_line2')}
              <br />
              <span className="inline-block bg-amarillo rounded-btn px-4 pb-1">
                {t('hero.title_line3')}
              </span>
            </h1>

            <p className="mt-6 t-heading-md text-negro">{t('hero.subtitle')}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="primary" size="lg" href={`#${SECTION_IDS.donate}`}>
                {t('hero.donar')}
              </Button>
              <Button variant="secondary" size="lg" href={`#${SECTION_IDS.collaborate}`}>
                {t('hero.como_ayudar')}
              </Button>
            </div>
          </div>

          {/* Image Column */}
          <div className="order-1 lg:order-2 relative">
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-[340px] h-[340px] rounded-full bg-amarillo" />
            <div className="absolute -left-4 bottom-20 w-16 h-16 rounded-full bg-naranja" />
            
            {/* Decorative paws */}
            <PawIcon 
              className="absolute -right-4 bottom-12 w-[72px] h-[72px] text-naranja-hover"
              style={{ transform: 'rotate(18deg)' }}
            />
            <PawIcon 
              className="absolute left-8 -top-4 w-10 h-10 text-amarillo"
              style={{ transform: 'rotate(-18deg)' }}
            />

            {/* Main photo */}
            <div className="relative">
              <Photo 
                src="/images/hero-perros.jpg"
                alt={t('hero.alt')}
                radius="panel"
                className="w-full h-auto aspect-[1504/1230] object-cover"
                loading="eager"
              />
              
              {/* Pills */}
              <div className="absolute top-4 left-4">
                <Pill>{t('hero.pill_1')}</Pill>
              </div>
              <div className="absolute bottom-4 left-4">
                <Pill>{t('hero.pill_2')}</Pill>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
