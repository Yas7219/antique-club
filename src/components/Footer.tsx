import { Link } from "react-router-dom";
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
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/furniture">{t("footer_furniture")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/coins">{t("footer_coins")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/art">{t("footer_art")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/watches">{t("footer_watches")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/books">Books & Manuscripts</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/jewelry">Jewelry</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/pottery">Pottery & Vases</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/marketplace/others">Others</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif-cap text-xs text-gold mb-3">{t("footer_club")}</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link className="transition-colors hover:text-gold" to="/auth">{t("footer_membership")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/verify">{t("footer_verification")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/chat">{t("footer_salon_chat")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif-cap text-xs text-gold mb-3">{t("footer_legal")}</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link className="transition-colors hover:text-gold" to="/terms">{t("footer_terms")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/privacy">{t("footer_privacy")}</Link></li>
            <li><Link className="transition-colors hover:text-gold" to="/authenticity">{t("footer_authenticity_guarantee")}</Link></li>
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
