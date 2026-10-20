import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown } from 'lucide-react';
import apiClient from '../api/client';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    document.documentElement.lang = nextLang;
    localStorage.setItem('i18nextLng', nextLang);
    // Sync preferred_language with user profile if authenticated
    apiClient.patch('/auth/profile/', { preferred_language: nextLang }).catch(() => {});
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 focus:outline-hidden transition-colors cursor-pointer"
      title="Switch Language / भाषा बदलें"
    >
      <Languages className="h-3.5 w-3.5 text-slate-600" />
      <span>{currentLang === 'en' ? 'हिंदी' : 'English'}</span>
      <ChevronDown className="h-3 w-3 text-slate-400" />
    </button>
  );
};

export default LanguageSwitcher;

