import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown, Check } from 'lucide-react';
import apiClient from '../api/client';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('hi') ? 'hi' : 'en';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLanguage = (lang: 'en' | 'hi') => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    localStorage.setItem('i18nextLng', lang);
    setIsOpen(false);
    // Sync preferred_language with user profile if authenticated
    apiClient.patch('/auth/profile/', { preferred_language: lang }).catch(() => {});
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white h-9 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 focus:outline-hidden transition-colors cursor-pointer"
        aria-label="Select Language / भाषा चुनें"
      >
        <Languages className="h-3.5 w-3.5 text-slate-600" />
        <span>{currentLang === 'hi' ? 'हिंदी' : 'English'}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 rounded-xl bg-white p-1 shadow-lg border border-slate-200 z-50 text-xs font-medium">
          <button
            type="button"
            onClick={() => selectLanguage('en')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
              currentLang === 'en' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>English</span>
            {currentLang === 'en' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
          <button
            type="button"
            onClick={() => selectLanguage('hi')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-colors ${
              currentLang === 'hi' ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>हिंदी</span>
            {currentLang === 'hi' && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
