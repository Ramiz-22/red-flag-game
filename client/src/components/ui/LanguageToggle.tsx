import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className }: LanguageToggleProps) {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      aria-label="Toggle language"
      className={
        className
          ? `${className} font-medium bg-surface-elevated border border-surface-border hover:bg-surface-border`
          : `px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-sm font-medium hover:bg-surface-border transition-colors`
      }
    >
      {lang === 'en' ? 'فارسی' : 'English'}
    </button>
  );
}
