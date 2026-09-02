import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Crown, Heart, MessageCircle, Search, Store, User as UserIcon, LogOut, Plus, Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";
import CurrencySelector from "@/components/CurrencySelector";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/language";
import { useKyc } from "@/lib/kyc";
import NotificationBell from "@/components/NotificationBell";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { status: kycStatus } = useKyc();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav_home"), icon: Crown },
    { to: "/marketplace", label: t("nav_marketplace"), icon: Store },
    { to: "/chat", label: t("nav_salon"), icon: MessageCircle },
    { to: "/wishlist", label: t("nav_wishlist"), icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gradient-noir shadow-gold">
            <Crown className="h-5 w-5 text-gold" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-2xl font-semibold tracking-tight">Antique<span className="text-gold">Club</span></div>
            <div className="font-serif-cap text-[10px] text-muted-foreground -mt-1">Marketplace · Est. MMXXV</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-all ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSelector />
          <CurrencySelector />
          <Button variant="ghost" size="icon" onClick={() => navigate("/marketplace")} className="hidden sm:inline-flex">
            <Search className="h-4 w-4" />
          </Button>
          {user ? (
            <>
              {kycStatus !== "verified" && (
                <Button onClick={() => navigate("/verify")} variant="outline" size="sm" className="hidden sm:inline-flex border-gold text-gold-dark">
                  <ShieldCheck className="h-4 w-4" /> {t("nav_verify")}
                </Button>
              )}
              <Button onClick={() => navigate("/sell")} className="hidden sm:inline-flex bg-gradient-gold text-ink hover:opacity-90 shadow-gold">
                <Plus className="h-4 w-4" /> {t("nav_sell")}
              </Button>
              <NotificationBell />
              <Button variant="outline" size="icon" onClick={() => navigate("/profile")}>
                <UserIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} className="bg-ink text-primary-foreground hover:bg-ink/90">
              {t("nav_enter_club")}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="container py-3 flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary text-sm">
                <Icon className="h-4 w-4 text-gold" /> {label}
              </Link>
            ))}
            {user ? (
              <>
                {kycStatus !== "verified" && (
                  <Link to="/verify" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary text-sm">
                    <ShieldCheck className="h-4 w-4 text-gold" /> {t("nav_verify")}
                  </Link>
                )}
                <Link to="/sell" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary text-sm">
                  <Plus className="h-4 w-4 text-gold" /> {t("nav_sell")}
                </Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary text-sm">
                  <UserIcon className="h-4 w-4 text-gold" /> {t("nav_profile")}
                </Link>
                <button
                  onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}
                  className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary text-sm text-left"
                >
                  <LogOut className="h-4 w-4 text-gold" /> {t("nav_signout")}
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-secondary text-sm">
                <UserIcon className="h-4 w-4 text-gold" /> {t("nav_enter_club")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
