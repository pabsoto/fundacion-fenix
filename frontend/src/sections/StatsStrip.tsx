import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { useStats } from '@/hooks/useStats';
import { useInstitutionalContent } from '@/hooks/useInstitutionalContent';
import { formatNumber } from '@/lib/format';

export function StatsStrip() {
  const { i18n } = useTranslation();
  const { data } = useStats();
  const { text } = useInstitutionalContent();
  const total = (data?.caninos.total ?? 0) + (data?.felinos.total ?? 0);

  const stats = [
    {
      key: 'official-total',
      stat: formatNumber(total, i18n.resolvedLanguage),
      label: text('estadistica_total_etiqueta'),
    },
    {
      key: 'free-program',
      stat: text('estadistica_gratuidad', 'titulo'),
      label: text('estadistica_gratuidad'),
    },
    {
      key: 'foundation-year',
      stat: text('estadistica_fundacion', 'titulo'),
      label: text('estadistica_fundacion'),
    },
    {
      key: 'pillars',
      stat: text('estadistica_pilares', 'titulo'),
      label: text('estadistica_pilares'),
    },
  ];

  return (
    <section className="bg-crema pb-16">
      <div className="mx-auto w-full max-w-[1264px] px-6 lg:px-8">
        <Card radius="panel" className="px-6 py-8 lg:px-10">
          <div className="grid grid-cols-2 divide-x divide-y divide-linea lg:grid-cols-4 lg:divide-y-0">
            {stats.map((item) => (
              <div
                key={item.key}
                className="flex flex-col items-center justify-center px-6 py-6 lg:py-2"
              >
                <p className="t-stat text-naranja">{item.stat}</p>
                <p className="mt-2 t-body text-center text-negro">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
