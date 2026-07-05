import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { t as translate } from '../i18n/strings';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'mamaout_content_lang';

// 'en' shows the English UI/translation (falling back to source when not yet
// translated); 'he' shows Hebrew UI + the original Hebrew content, RTL layout.
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; } catch { return 'en'; }
  });

  const setLang = useCallback(l => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext) || { lang: 'en', setLang: () => {}, dir: 'ltr', t: (key, vars) => translate('en', key, vars) };
}
