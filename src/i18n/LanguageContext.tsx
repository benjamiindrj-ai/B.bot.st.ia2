import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { AppLanguage } from '../types';
import { translations } from './translations';
import { SUPPORTED_LANGUAGES } from '../utils/appSettingsDefaults';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (path: string, fallback?: string) => string;
  languages: typeof SUPPORTED_LANGUAGES;
  currentLanguageMeta: typeof SUPPORTED_LANGUAGES[0];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'stake_bot_app_language';

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
  onLanguageChange,
}) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'fr' || saved === 'en' || saved === 'es' || saved === 'de' || saved === 'pt')) {
        return saved as AppLanguage;
      }
      // Check browser navigator language
      const navLang = navigator.language?.slice(0, 2);
      if (navLang === 'en' || navLang === 'es' || navLang === 'de' || navLang === 'pt' || navLang === 'fr') {
        return navLang as AppLanguage;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'fr';
  });

  // Sync if initialLanguage prop changes externally
  useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguageState(initialLanguage);
    }
  }, [initialLanguage]);

  const setLanguage = (newLang: AppLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Could not persist language to localStorage:', e);
    }
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const currentLanguageMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const t = useMemo(() => {
    return (path: string, fallback?: string): string => {
      const parts = path.split('.');
      let current: any = translations[language];

      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }

      if (typeof current === 'string') {
        return current;
      }

      // Fallback to English if translation is missing in current language
      if (language !== 'en') {
        let enCurrent: any = translations.en;
        for (const part of parts) {
          if (enCurrent && typeof enCurrent === 'object' && part in enCurrent) {
            enCurrent = enCurrent[part];
          } else {
            enCurrent = undefined;
            break;
          }
        }
        if (typeof enCurrent === 'string') {
          return enCurrent;
        }
      }

      // Fallback to French if also not in English
      if (language !== 'fr') {
        let frCurrent: any = translations.fr;
        for (const part of parts) {
          if (frCurrent && typeof frCurrent === 'object' && part in frCurrent) {
            frCurrent = frCurrent[part];
          } else {
            frCurrent = undefined;
            break;
          }
        }
        if (typeof frCurrent === 'string') {
          return frCurrent;
        }
      }

      return fallback !== undefined ? fallback : path;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageMeta,
    }),
    [language, t, currentLanguageMeta]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackT = (path: string, fallback?: string) => fallback || path;
    return {
      language: 'fr',
      setLanguage: () => {},
      t: fallbackT,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageMeta: SUPPORTED_LANGUAGES[0],
    };
  }
  return context;
};
