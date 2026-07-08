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

// Safari wirft bei blockiertem Speicher (ITP / Private Mode) einen SecurityError
// bei localStorage-Zugriff. Der i18next-Sprachdetektor darf die App dann NICHT
// abstürzen lassen -> vorher prüfen, ob localStorage wirklich nutzbar ist.
function hasLocalStorage() {
  try {
    const k = '__i18n_ls_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

if (!i18n.isInitialized) {
  const setup = i18n.use(initReactI18next);

  const inBrowser = typeof window !== 'undefined';
  const canUseLocalStorage = inBrowser && hasLocalStorage();

  // Language detection only works in the browser
  if (inBrowser) {
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
    ...(inBrowser && {
      detection: canUseLocalStorage
        ? { order: ['localStorage', 'navigator'], caches: ['localStorage'] }
        : { order: ['navigator'], caches: [] } // Speicher blockiert -> localStorage meiden
    })
  });
}

export default i18n;
