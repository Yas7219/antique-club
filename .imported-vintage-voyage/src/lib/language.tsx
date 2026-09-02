import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TRANSLATIONS, TranslationKey, RTL_LANGS } from "@/lib/i18n";

// Site-wide language/translation preference.
// Hebrew intentionally excluded.
export interface LangOption { code: string; label: string }

export const LANGS: LangOption[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "tr", label: "Türkçe" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "sv", label: "Svenska" },
  { code: "hi", label: "हिन्दी" },
  { code: "fa", label: "فارسی" },
  { code: "ur", label: "اردو" },
];

interface LanguageContextValue {
  lang: string;
  setLang: (code: string) => void;
  /** Translates a UI string key using the current language, falling back to English. */
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => TRANSLATIONS.en[key],
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<string>(() => localStorage.getItem("translateLang") || "en");

  const setLang = (code: string) => {
    setLangState(code);
    localStorage.setItem("translateLang", code);
  };

  // Keep <html lang> and text direction in sync with the selected language.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  }, [lang]);

  const t = (key: TranslationKey): string => {
    const dict = (TRANSLATIONS as Record<string, Record<string, string>>)[lang];
    return dict?.[key] ?? TRANSLATIONS.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
