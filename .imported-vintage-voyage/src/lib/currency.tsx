import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Multi-currency support — Israeli Shekel (ILS) intentionally excluded.
export type Currency =
  | "MAD" | "EUR" | "USD" | "GBP" | "CHF" | "JPY" | "CNY" | "AED" | "SAR"
  | "EGP" | "TRY" | "CAD" | "AUD" | "INR" | "BRL" | "ZAR" | "RUB" | "KRW"
  | "MXN" | "SEK" | "NOK" | "DKK";

// Approximate rates relative to MAD (1 MAD = X target). Static — good enough for display.
const RATES_FROM_MAD: Record<Currency, number> = {
  MAD: 1,
  EUR: 0.092,
  USD: 0.10,
  GBP: 0.079,
  CHF: 0.088,
  JPY: 15.5,
  CNY: 0.72,
  AED: 0.37,
  SAR: 0.38,
  EGP: 4.95,
  TRY: 3.45,
  CAD: 0.14,
  AUD: 0.155,
  INR: 8.4,
  BRL: 0.58,
  ZAR: 1.85,
  RUB: 9.3,
  KRW: 138,
  MXN: 1.95,
  SEK: 1.06,
  NOK: 1.08,
  DKK: 0.69,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  MAD: "DH", EUR: "€", USD: "$", GBP: "£", CHF: "CHF", JPY: "¥", CNY: "¥",
  AED: "د.إ", SAR: "﷼", EGP: "E£", TRY: "₺", CAD: "C$", AUD: "A$", INR: "₹",
  BRL: "R$", ZAR: "R", RUB: "₽", KRW: "₩", MXN: "Mex$", SEK: "kr", NOK: "kr", DKK: "kr",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  MAD: "Moroccan Dirham", EUR: "Euro", USD: "US Dollar", GBP: "British Pound",
  CHF: "Swiss Franc", JPY: "Japanese Yen", CNY: "Chinese Yuan", AED: "UAE Dirham",
  SAR: "Saudi Riyal", EGP: "Egyptian Pound", TRY: "Turkish Lira", CAD: "Canadian Dollar",
  AUD: "Australian Dollar", INR: "Indian Rupee", BRL: "Brazilian Real",
  ZAR: "South African Rand", RUB: "Russian Ruble", KRW: "South Korean Won",
  MXN: "Mexican Peso", SEK: "Swedish Krona", NOK: "Norwegian Krone", DKK: "Danish Krone",
};

export const CURRENCY_LIST = Object.keys(RATES_FROM_MAD) as Currency[];

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (amount: number, from: string) => number;
  format: (amount: number, from: string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "MAD",
  setCurrency: () => {},
  convert: (a) => a,
  format: (a) => String(a),
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>("MAD");

  useEffect(() => {
    const saved = localStorage.getItem("currency") as Currency | null;
    if (saved && saved in RATES_FROM_MAD) setCurrencyState(saved);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("currency", c);
  };

  const convert = (amount: number, from: string) => {
    const upper = (from || "MAD").toUpperCase();
    const src: Currency = (upper in RATES_FROM_MAD ? upper : "MAD") as Currency;
    const inMad = amount / RATES_FROM_MAD[src];
    return inMad * RATES_FROM_MAD[currency];
  };

  const format = (amount: number, from: string) => {
    const value = convert(amount, from);
    const rounded = value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(2);
    return `${rounded} ${CURRENCY_SYMBOLS[currency]}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
