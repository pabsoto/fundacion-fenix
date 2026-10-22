import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';

export function StatsStrip() {
  const { t } = useTranslation();

  const stats = [
    { stat: 'stats.stat1', label: 'stats.label1' },
    { stat: 'stats.stat2', label: 'stats.label2' },
    { stat: 'stats.stat3', label: 'stats.label3' },
    { stat: 'stats.stat4', label: 'stats.label4' },
  ];

  return (
    <section className="bg-crema pb-18">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
        <Card radius="panel" className="px-10 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-linea">
            {stats.map((item,_index) => (
              <div key={_index} className="flex flex-col items-center justify-center px-6 py-4 lg:py-0">
                <p className="t-stat text-naranja">{t(item.stat)}</p>
                <p className="mt-2 t-body text-negro text-center">{t(item.label)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

