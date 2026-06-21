import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import i18n from '../i18n';

interface LanguageContextType {
  lang: 'en' | 'fa';
  dir: 'ltr' | 'rtl';
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  dir: 'ltr',
  toggleLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'en' | 'fa'>(
    (localStorage.getItem('lang') as 'en' | 'fa') || 'en'
  );

  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'fa' : 'en';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.body.style.fontFamily =
      lang === 'fa' ? "'Vazirmatn', sans-serif" : "'Inter', sans-serif";
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, dir, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
