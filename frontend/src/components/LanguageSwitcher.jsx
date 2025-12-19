import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'de' ? 'ru' : 'de';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
      title="Sprache wechseln / Сменить язык"
    >
      <Globe className="h-4 w-4 text-gray-600" />
      <span>{currentLang.flag}</span>
      <span className="hidden sm:inline">{currentLang.name}</span>
    </button>
  );
}

export default LanguageSwitcher;
