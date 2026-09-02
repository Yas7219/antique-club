import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Heart, MapPin, MessageCircle, Phone, Sparkles, Verified, ShieldCheck } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";

interface Product {
  id: string; title: string; description: string; price: number; currency: string;
  era: string | null; condition: string | null; images: string[]; location: string | null;
  category_slug: string | null; ai_origin: string | null; ai_authenticity: string | null;
  seller_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null; verified: boolean; level: string; phone: string | null; bio: string | null };
}

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const { t } = useLanguage();
  const [p, setP] = useState<Product | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("products").select("*, profiles(username,display_name,avatar_url,verified,level,phone,bio)").eq("id", id).maybeSingle();
      setP(data as any);
      if (user && data) {
        const { data: w } = await supabase.from("wishlist").select("user_id").eq("user_id", user.id).eq("product_id", id).maybeSingle();
        setWished(!!w);
      }
    })();
  }, [id, user]);

  const toggleWish = async () => {
    if (!user) return toast({ title: t("pd_sign_in_required"), description: t("pd_join_club_save") });
    if (!p) return;
    if (wished) {
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", p.id);
      setWished(false);
    } else {
      await supabase.from("wishlist").insert({ user_id: user.id, product_id: p.id });
      setWished(true);
      toast({ title: t("pd_saved"), description: t("pd_added_wishlist") });
    }
  };

  if (!p) return <div className="min-h-screen"><Navbar /><div className="container py-20 animate-shimmer h-96" /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-10 grid gap-10 lg:grid-cols-[1.2fr,1fr]">
        <div>
          <div className="frame-card overflow-hidden aspect-square bg-secondary">
            <img src={p.images[activeImg] || "/placeholder.svg"} alt={p.title} className="h-full w-full object-cover" />
          </div>
          {p.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {p.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square overflow-hidden border ${i === activeImg ? "border-gold" : "border-border"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {p.era && <div className="font-serif-cap text-xs text-gold-dark mb-2">{p.era}</div>}
          <h1 className="font-display text-4xl md:text-5xl leading-tight mb-3">{p.title}</h1>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="font-display text-4xl text-gold-dark font-semibold">{format(p.price, p.currency)}</span>
            <span className="text-xs text-muted-foreground font-serif-cap">{t("pd_orig")} {p.price.toLocaleString()} {p.currency}</span>
          </div>
          {p.location && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><MapPin className="h-4 w-4" /> {p.location}</div>}
          <div className="gold-divider my-5" />
          <p className="text-foreground/85 leading-relaxed whitespace-pre-line">{p.description}</p>

          {(p.ai_origin || p.ai_authenticity) && (
            <div className="mt-6 frame-card p-5 bg-gradient-parchment">
              <div className="flex items-center gap-2 mb-3 font-serif-cap text-xs text-gold-dark"><Sparkles className="h-4 w-4" /> {t("pd_ai_authentication")}</div>
              {p.ai_origin && <div className="text-sm"><strong>{t("pd_estimated_origin")}</strong> {p.ai_origin}</div>}
              {p.ai_authenticity && <div className="text-sm mt-1"><strong>{t("pd_authenticity")}</strong> {p.ai_authenticity}</div>}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button size="lg" className="flex-1 bg-gradient-gold text-ink shadow-gold" onClick={() => toast({ title: t("pd_open_salon_title"), description: t("pd_open_salon_desc") })}>
              <MessageCircle className="h-4 w-4" /> {t("pd_contact_seller")}
            </Button>
            <Button size="lg" variant="outline" onClick={toggleWish}>
              <Heart className={`h-4 w-4 ${wished ? "fill-burgundy text-burgundy" : ""}`} />
            </Button>
          </div>

          {/* SELLER CARD */}
          <div className="mt-8 frame-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-gold flex items-center justify-center font-display text-xl text-ink">
                {(p.profiles.display_name || p.profiles.username)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <Link to={`/u/${p.profiles.username}`} className="flex items-center gap-2 font-display text-xl hover:text-gold-dark">
                  {p.profiles.display_name || p.profiles.username}
                  {p.profiles.verified && <Verified className="h-4 w-4 text-gold" />}
                </Link>
                <div className="text-xs text-muted-foreground">@{p.profiles.username} · {p.profiles.level}</div>
              </div>
              <ShieldCheck className="h-5 w-5 text-gold-dark" />
            </div>
            {p.profiles.bio && <p className="text-sm text-muted-foreground mt-3">{p.profiles.bio}</p>}
            {p.profiles.phone && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gold-dark" /> {t("pd_contact")} {p.profiles.phone}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
