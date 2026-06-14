import { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'mamaout_content_lang';

// 'en' shows the English translation (falling back to source when not yet
// translated); 'he' shows the original Hebrew.
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; } catch { return 'en'; }
  });

  const setLang = useCallback(l => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext) || { lang: 'en', setLang: () => {} };
}
