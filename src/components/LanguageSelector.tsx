import { useLanguage, LANGS } from "@/lib/language";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages } from "lucide-react";

const LanguageSelector = () => {
  const { lang, setLang } = useLanguage();
  return (
    <Select value={lang} onValueChange={setLang}>
      <SelectTrigger className="h-9 w-[52px] sm:w-[110px] border-border/60 font-serif-cap text-xs px-2">
        <Languages className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline"><SelectValue /></span>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-80">
        {LANGS.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            <span className="text-xs">{l.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;
