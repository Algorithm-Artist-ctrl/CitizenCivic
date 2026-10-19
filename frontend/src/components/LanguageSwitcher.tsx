import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition-colors"
      title="Switch Language / भाषा बदलें"
    >
      <Languages className="h-3.5 w-3.5 text-emerald-700" />
      <span>{currentLang === 'en' ? 'हिंदी' : 'English'}</span>
    </button>
  );
};

export default LanguageSwitcher;
