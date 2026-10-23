import { useTranslation } from 'react-i18next';
import { FacebookIcon } from '@/components/ui/icons';

export function FacebookFeed() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="text-center">
        <p className="t-eyebrow mb-4 text-negro">{t('facebook.eyebrow')}</p>
        <h2 className="t-section text-negro">{t('facebook.title')}</h2>
      </div>

      <div className="flex w-full max-w-[800px] flex-col items-center justify-center gap-6 rounded-panel border-[1.5px] border-dashed border-linea bg-blanco p-8 md:p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amarillo">
          <FacebookIcon className="h-[30px] w-[30px] text-negro" />
        </div>

        {/* TODO: sustituir este campo por el Page Plugin oficial de Facebook (iframe). */}
        <input
          type="text"
          readOnly
          value={t('facebook.placeholder')}
          className="w-full max-w-[640px] rounded-btn border-[1.5px] border-negro bg-crema px-6 py-[18px] t-body-lg text-negro"
          aria-label={t('facebook.placeholder')}
        />

        <p className="t-small text-center text-negro">{t('facebook.note')}</p>
      </div>
    </div>
  );
}
