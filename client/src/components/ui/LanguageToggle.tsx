import { useLanguage } from '../../contexts/LanguageContext';

export default function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border
                 text-sm font-medium hover:bg-surface-border transition-colors"
    >
      {lang === 'en' ? 'فارسی' : 'English'}
    </button>
  );
}
