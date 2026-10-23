import { SectionHeader } from '@/components/ui/SectionHeader';
import { ResultsOverview } from './ResultsOverview';
import { Stories } from './Stories';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';

export function Results() {
  const { text } = useInstitutionalContent();

  return (
    <div className="flex flex-col gap-20">
      <SectionHeader
        title={text('resultados_intro', 'titulo')}
        subtitle={text('resultados_intro')}
      />
      <ResultsOverview />
      <Stories />
    </div>
  );
}
