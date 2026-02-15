import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Lang, Dictionary } from '@/i18n/types';
import { hu } from '@/i18n/hu';
import { en } from '@/i18n/en';

const dictionaries: Record<Lang, Dictionary> = { hu, en };

interface LanguageContextType {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  /** Prefix a path with /en if in English mode */
  localePath: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectLangFromPath(pathname: string): Lang {
  return pathname.startsWith('/en') ? 'en' : 'hu';
}

/** Strip /en prefix from a path for internal routing */
export function stripLangPrefix(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const langFromUrl = detectLangFromPath(location.pathname);
  const [lang, setLangState] = useState<Lang>(langFromUrl);

  // Sync lang when URL changes externally
  useEffect(() => {
    const urlLang = detectLangFromPath(location.pathname);
    if (urlLang !== lang) setLangState(urlLang);
  }, [location.pathname]);

  const t = useMemo(() => dictionaries[lang], [lang]);

  const localePath = useCallback(
    (path: string) => (lang === 'en' ? `/en${path === '/' ? '' : path}` : path),
    [lang]
  );

  const setLang = useCallback(
    (newLang: Lang) => {
      if (newLang === lang) return;
      setLangState(newLang);
      // Persist preference
      localStorage.setItem('grithu-lang', newLang);
      // Navigate to equivalent path in new language
      const stripped = stripLangPrefix(location.pathname);
      const newPath = newLang === 'en' ? `/en${stripped === '/' ? '' : stripped}` : stripped;
      navigate(newPath + location.search + location.hash, { replace: true });
    },
    [lang, location, navigate]
  );

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, localePath }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
