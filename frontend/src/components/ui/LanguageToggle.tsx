import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/cn';

const LANGS = ['es', 'en'] as const;

// HU-19 / RNF-02 / RNF-03
export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'es').split('-')[0];

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className="inline-flex items-center gap-2 rounded-full border border-linea px-1 py-1"
    >
      <Globe className="h-4 w-4 ml-2 text-negro" aria-hidden="true" />
      <div className="flex gap-1">
        {LANGS.map((code) => (
          <button
            type="button"
            key={code}
            lang={code}
            aria-label={t(`nav.${code}_name`)}
            aria-pressed={currentLang === code}
            onClick={() => i18n.changeLanguage(code)}
            className={cn(
              'min-h-[44px] min-w-[44px] rounded-full px-3 t-nav transition-colors',
              currentLang === code ? 'bg-negro text-crema' : 'text-negro hover:bg-crema-tono',
            )}
          >
            {t(`nav.${code}_label`)}
          </button>
        ))}
      </div>
    </div>
  );
}
