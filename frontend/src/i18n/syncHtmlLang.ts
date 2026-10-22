import i18n from 'i18next';

// HU-19 / RNF-02: mantiene <html lang> alineado con el idioma activo.
export function syncHtmlLang() {
  const apply = (lng?: string) => {
    document.documentElement.lang = (lng || 'es').split('-')[0];
  };
  apply(i18n.resolvedLanguage || i18n.language);
  i18n.on('languageChanged', apply);
}
