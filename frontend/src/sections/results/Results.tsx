import { SectionHeader } from '@/components/ui/SectionHeader';
import { ResultsOverview } from './ResultsOverview';
import { Stories } from './Stories';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { DEMO_SHOWCASE } from '@/lib/demo';

export function Results() {
  const { text } = useInstitutionalContent();

  return (
    <div className="flex flex-col gap-20">
      <div className="flex flex-col items-center gap-4">
        {DEMO_SHOWCASE && <DemoBadge />}
        <SectionHeader
          title={text('resultados_intro', 'titulo')}
          subtitle={text('resultados_intro')}
        />
      </div>
      <ResultsOverview />
      <Stories />
    </div>
  );
}
