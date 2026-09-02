import { Currency, useCurrency, CURRENCY_SYMBOLS, CURRENCY_LIST, CURRENCY_LABELS } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CurrencySelector = () => {
  const { currency, setCurrency } = useCurrency();
  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
      <SelectTrigger className="h-9 w-[100px] border-border/60 font-serif-cap text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="max-h-80">
        {CURRENCY_LIST.map((c) => (
          <SelectItem key={c} value={c}>
            <span className="font-serif-cap text-xs">{c} {CURRENCY_SYMBOLS[c]}</span>
            <span className="text-[10px] text-muted-foreground ml-2">{CURRENCY_LABELS[c]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
