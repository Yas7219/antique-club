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

const CATEGORY_NAMES: Record<string, Record<string, string>> = {
  furniture: { en: "Furniture", fr: "Mobilier", ar: "أثاث", tr: "Mobilya", es: "Mobiliario", de: "Möbel", it: "Arredamento", pt: "Mobiliário", ru: "Мебель", zh: "家具", ja: "家具", ko: "가구" },
  coins: { en: "Coins & Medals", fr: "Pièces et médailles", ar: "عملات وميداليات", tr: "Madeni Paralar ve Madalyalar", es: "Monedas y medallas", de: "Münzen und Medaillen", it: "Monete e medaglie", pt: "Moedas e medalhas", ru: "Монеты и медали", zh: "钱币与奖章", ja: "コインとメダル", ko: "동전과 메달" },
  art: { en: "Fine Art", fr: "Beaux-arts", ar: "الفن التشكيلي", tr: "Güzel Sanatlar", es: "Bellas artes", de: "Bildende Kunst", it: "Belle arti", pt: "Belas-artes", ru: "Изобразительное искусство", zh: "美术", ja: "美術", ko: "미술" },
  watches: { en: "Watches", fr: "Montres", ar: "ساعات", tr: "Saatler", es: "Relojes", de: "Uhren", it: "Orologi", pt: "Relógios", ru: "Часы", zh: "腕表", ja: "時計", ko: "시계" },
  books: { en: "Books & Manuscripts", fr: "Livres et manuscrits", ar: "كتب ومخطوطات", tr: "Kitaplar ve El Yazmaları", es: "Libros y manuscritos", de: "Bücher und Manuskripte", it: "Libri e manoscritti", pt: "Livros e manuscritos", ru: "Книги и рукописи", zh: "书籍与手稿", ja: "書籍と写本", ko: "서적과 필사본" },
  jewelry: { en: "Jewelry", fr: "Bijoux", ar: "مجوهرات", tr: "Mücevher", es: "Joyería", de: "Schmuck", it: "Gioielli", pt: "Joias", ru: "Ювелирные изделия", zh: "珠宝", ja: "宝飾品", ko: "보석" },
  pottery: { en: "Pottery & Ceramics", fr: "Poterie et céramique", ar: "الفخار والسيراميك", tr: "Çömlek ve Seramik", es: "Cerámica", de: "Keramik", it: "Ceramiche", pt: "Cerâmica", ru: "Керамика", zh: "陶器与瓷器", ja: "陶磁器", ko: "도자기" },
  others: { en: "Sculpture & Objects", fr: "Sculptures et objets", ar: "منحوتات وأغراض", tr: "Heykel ve Objeler", es: "Escultura y objetos", de: "Skulpturen und Objekte", it: "Sculture e oggetti", pt: "Esculturas e objetos", ru: "Скульптура и предметы", zh: "雕塑与器物", ja: "彫刻とオブジェ", ko: "조각과 오브제" },
};

export const categoryLabel = (slug: string, lang: string, fallback?: string) =>
  CATEGORY_NAMES[slug]?.[lang] || CATEGORY_NAMES[slug]?.en || fallback || slug;

export const useLanguage = () => useContext(LanguageContext);
