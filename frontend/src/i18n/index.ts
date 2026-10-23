import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

function getInitialLanguage(): string {
  const saved = localStorage.getItem('fenix-language');
  if (saved && (saved === 'es' || saved === 'en')) {
    return saved;
  }
  const browserLang = navigator.language || navigator.languages?.[0] || '';
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  return 'es';
}

const initialLanguage = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: initialLanguage,
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
});

function updateDocumentLanguage(lng: string) {
  document.documentElement.lang = lng;
  const title = i18n.t('meta.title');
  if (title && title !== 'meta.title') {
    document.title = title;
  }
}

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('fenix-language', lng);
  updateDocumentLanguage(lng);
});

updateDocumentLanguage(initialLanguage);

export default i18n;
