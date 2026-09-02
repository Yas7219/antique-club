import { Crown } from "lucide-react";
import { useLanguage } from "@/lib/language";

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="mt-24 border-t border-border/60 bg-gradient-noir text-primary-foreground">
      <div className="container py-14 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-5 w-5 text-gold" />
            <span className="font-display text-2xl">Antique<span className="text-gold">Club</span></span>
          </div>
          <p className="text-sm opacity-70 leading-relaxed">{t("footer_tagline")}</p>
        </div>
        <div>
          <h4 className="font-serif-cap text-xs text-gold mb-3">{t("footer_marketplace")}</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>{t("footer_furniture")}</li><li>{t("footer_coins")}</li><li>{t("footer_art")}</li><li>{t("footer_watches")}</li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif-cap text-xs text-gold mb-3">{t("footer_club")}</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>{t("footer_membership")}</li><li>{t("footer_verification")}</li><li>{t("footer_salon_chat")}</li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif-cap text-xs text-gold mb-3">{t("footer_legal")}</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>{t("footer_terms")}</li><li>{t("footer_privacy")}</li><li>{t("footer_authenticity_guarantee")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs opacity-60">
        {t("footer_copyright")}
      </div>
    </footer>
  );
};

export default Footer;
