import { Hero } from '@/sections/Hero';
import { StatsStrip } from '@/sections/StatsStrip';
import { About } from '@/sections/About';
import { Pillars } from '@/sections/Pillars';
import { Program } from '@/sections/Program';
import { Financing } from '@/sections/Financing';
import { Campaigns } from '@/sections/campaigns/Campaigns';
import { Results } from '@/sections/results/Results';
import { SectionBand } from '@/components/ui/SectionBand';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTranslation } from 'react-i18next';
import { SECTION_IDS } from '@/lib/constants';
import { FacebookFeed } from '@/sections/FacebookFeed';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Hero />
      <StatsStrip />
      
      <SectionBand id={SECTION_IDS.about} tone="crema">
        <About />
      </SectionBand>
      
      <SectionBand id={SECTION_IDS.pillars} tone="tono" decor>
        <Pillars />
      </SectionBand>
      
      <SectionBand id={SECTION_IDS.program} tone="crema">
        <div className="flex flex-col gap-24">
          <Program />
          <Financing />
          <Campaigns />
        </div>
      </SectionBand>
      
      <SectionBand id={SECTION_IDS.results} tone="tono" decor>
        <Results />
      </SectionBand>
      
      <SectionBand id={SECTION_IDS.collaborate} tone="crema">
        <SectionHeader title={t('sections.como_colaborar')} />
      </SectionBand>
      
      <SectionBand id={SECTION_IDS.donate} tone="tono">
        <SectionHeader title={t('sections.donar')} />
      </SectionBand>
      
      <div id={SECTION_IDS.contact} className="bg-crema-tono py-18">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <SectionHeader title={t('nav.contactos')} />
          <FacebookFeed />
        </div>
      </div>
    </>
  );
}

