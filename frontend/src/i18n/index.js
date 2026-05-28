import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import ru from './locales/ru.json';
import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  de: { translation: de },
  ru: { translation: ru },
  en: { translation: en },
  es: { translation: es }
};

if (!i18n.isInitialized) {
  const setup = i18n.use(initReactI18next);

  // Language detection only works in the browser
  if (typeof window !== 'undefined') {
    const LanguageDetector = require('i18next-browser-languagedetector').default;
    setup.use(LanguageDetector);
  }

  setup.init({
    resources,
    fallbackLng: 'de',
    lng: 'de',
    interpolation: {
      escapeValue: false
    },
    ...(typeof window !== 'undefined' && {
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage']
      }
    })
  });
}

export default i18n;
