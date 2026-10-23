import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ResultsOverview } from './ResultsOverview';
import { Stories } from './Stories';

export function Results() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-16">
      <SectionHeader
        title={t('results.title')}
        subtitle={t('results.subtitle')}
      />
      <ResultsOverview />
      <Stories />
    </div>
  );
}
