import { Hero } from '@/sections/Hero';
import { StatsStrip } from '@/sections/StatsStrip';
import { About } from '@/sections/About';
import { Pillars } from '@/sections/Pillars';
import { Program } from '@/sections/Program';
import { Financing } from '@/sections/Financing';
import { Campaigns } from '@/sections/campaigns/Campaigns';
import { Results } from '@/sections/results/Results';
import { Collaborate } from '@/sections/Collaborate';
import { Donate } from '@/sections/Donate';
import { FacebookFeed } from '@/sections/FacebookFeed';
import { SectionBand } from '@/components/ui/SectionBand';
import { ContactFooter } from '@/components/layout/ContactFooter';
import { SECTION_IDS } from '@/lib/constants';

export function HomePage() {
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
        <Collaborate />
      </SectionBand>

      <SectionBand id={SECTION_IDS.donate} tone="tono" decor>
        <Donate />
      </SectionBand>

      <div id={SECTION_IDS.contact}>
        <SectionBand tone="crema">
          <FacebookFeed />
        </SectionBand>
        <ContactFooter />
      </div>
    </>
  );
}
