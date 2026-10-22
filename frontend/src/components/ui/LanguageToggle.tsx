import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/cn';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-linea px-1 py-1">
      <Globe className="h-4 w-4 text-negro" />
      <div className="flex gap-1">
        <button
          onClick={() => changeLanguage('es')}
          className={cn(
            'rounded-full px-3 py-1 t-nav transition-colors',
            currentLang === 'es' ? 'bg-negro text-crema' : 'text-negro hover:bg-crema'
          )}
        >
          ES
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={cn(
            'rounded-full px-3 py-1 t-nav transition-colors',
            currentLang === 'en' ? 'bg-negro text-crema' : 'text-negro hover:bg-crema'
          )}
        >
          EN
        </button>
      </div>
    </div>
  );
}

