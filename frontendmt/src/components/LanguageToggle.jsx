import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('mr') ? 'en' : 'mr';
    i18n.changeLanguage(nextLang);
  };

  const isMarathi = i18n.language.startsWith('mr');

  return (
    <button
      onClick={toggleLanguage}
      title="Switch Language / भाषा बदला"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-csk-slate/50 hover:bg-csk-yellow/20 dark:hover:bg-csk-yellow/20 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
    >
      <span className="text-csk-blue dark:text-csk-yellow">🌐</span>
      <span>{isMarathi ? 'मराठी' : 'English'}</span>
    </button>
  );
}