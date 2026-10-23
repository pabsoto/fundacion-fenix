import { useTranslation } from 'react-i18next';

export function DemoBadge() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex w-fit rounded-btn border border-negro/20 bg-amarillo px-3 py-1 t-small text-negro">
      {t('demo.label')}
    </span>
  );
}
