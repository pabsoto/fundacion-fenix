import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Pill } from '@/components/ui/Pill';
import { Photo } from '@/components/ui/Photo';
import { PawIcon } from '@/components/ui/icons';
import { SECTION_IDS } from '@/lib/constants';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';

export function Hero() {
  const { t } = useTranslation();
  const { text } = useInstitutionalContent();
  const title = text('hero_principal', 'titulo').split('\n');
  const context = text('hero_contexto').split('\n');

  return (
    <section id={SECTION_IDS.home} className="overflow-x-clip bg-crema pb-14 pt-10 lg:pb-20 lg:pt-14">
      <div className="mx-auto w-full max-w-[1264px] px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            <Chip>{text('hero_contexto', 'titulo')}</Chip>

            <h1 className="t-hero leading-tight text-negro">
              {title[0]}
              <br />
              {title[1]}
              <br />
              <span className="inline-block rounded-btn bg-amarillo px-4 pb-1">
                {title[2]}
              </span>
            </h1>

            <p className="t-heading-md text-negro">{text('hero_principal')}</p>

            <div className="flex flex-wrap gap-4">
              <Button variant="primary" size="lg" href={`#${SECTION_IDS.donate}`}>
                {t('hero.donar')}
              </Button>
              <Button variant="secondary" size="lg" href={`#${SECTION_IDS.collaborate}`}>
                {t('hero.como_ayudar')}
              </Button>
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="absolute -top-8 -right-8 h-[340px] w-[340px] rounded-full bg-amarillo" />
            <div className="absolute bottom-20 -left-4 h-16 w-16 rounded-full bg-naranja" />

            <PawIcon className="absolute right-0 bottom-12 size-[72px] rotate-[18deg] text-naranja-hover" />
            <PawIcon className="absolute top-0 left-8 size-10 -rotate-[18deg] text-amarillo" />

            <div className="relative">
              <Photo
                src="/images/hero-perros.jpg"
                alt={t('hero.alt')}
                radius="panel"
                width={1504}
                height={1230}
                fetchPriority="high"
                loading="eager"
                className="aspect-[1504/1230] h-auto w-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <Pill>{context[0]}</Pill>
              </div>
              <div className="absolute bottom-4 left-4">
                <Pill>{context[1]}</Pill>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
