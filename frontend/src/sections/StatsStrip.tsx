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
    <section className="bg-crema pb-16">
      <div className="mx-auto w-full max-w-[1264px] px-6 lg:px-8">
        <Card radius="panel" className="px-6 py-8 lg:px-10">
          <div className="grid grid-cols-2 divide-x divide-y divide-linea lg:grid-cols-4 lg:divide-y-0">
            {stats.map((item) => (
              <div
                key={item.stat}
                className="flex flex-col items-center justify-center px-6 py-6 lg:py-2"
              >
                <p className="t-stat text-naranja">{t(item.stat)}</p>
                <p className="mt-2 t-body text-center text-negro">{t(item.label)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
