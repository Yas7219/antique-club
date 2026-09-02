import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import heroImg from "@/assets/hero-antiques.jpg";
import dailyImg from "@/assets/daily-post.jpg";
import {
  Armchair, Coins, Palette, Watch, FlaskConical, BookOpen, Gem, Sparkles,
  ArrowRight, ShieldCheck, Globe, Award, Scroll
} from "lucide-react";

const ICONS: Record<string, any> = { Armchair, Coins, Palette, Watch, FlaskConical, BookOpen, Gem, Sparkles };

interface Category { id: string; name: string; slug: string; icon: string | null; description: string | null }
interface DailyPost { title: string; content: string; image_url: string | null }

const Index = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [daily, setDaily] = useState<DailyPost | null>(null);

  useEffect(() => {
    (async () => {
      const [c, p, d] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("id,title,price,currency,era,location,images,category_slug,profiles(username,verified)").eq("status", "active").order("created_at", { ascending: false }).limit(8),
        supabase.from("daily_posts").select("title,content,image_url").order("post_date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setCategories(c.data || []);
      setProducts((p.data as any) || []);
      setDaily(d.data || { title: "The Egyptian Scarab — Symbol of Rebirth", content: "In ancient Egypt, the scarab beetle was sacred to the god Khepri…", image_url: dailyImg });
    })();
  }, []);

  const trustItems = [
    { icon: ShieldCheck, title: t("trust_verified_title"), text: t("trust_verified_text") },
    { icon: Award, title: t("trust_ai_title"), text: t("trust_ai_text") },
    { icon: Globe, title: t("trust_salon_title"), text: t("trust_salon_text") },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-noir text-primary-foreground">
        <div className="absolute inset-0 opacity-60">
          <img src={heroImg} alt="Antique still life with pocket watch and Roman bust" width={1920} height={1080} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        </div>
        <div className="container relative grid gap-10 py-24 md:py-36 md:grid-cols-2 items-center">
          <div className="animate-fade-up max-w-xl">
            <div className="font-serif-cap text-xs text-gold mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-gold" /> {t("established")}
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
              {t("hero_title_pre")}<span className="gold-text italic">{t("hero_title_em")}</span>{t("hero_title_post")}
            </h1>
            <p className="text-lg opacity-80 leading-relaxed mb-8 max-w-lg">
              {t("hero_subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/marketplace">
                <Button size="lg" className="bg-gradient-gold text-ink hover:opacity-90 shadow-gold font-medium">
                  {t("explore_collection")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
                  {t("join_club")}
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-8 text-sm opacity-80">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" /> {t("verified_sellers")}</div>
              <div className="flex items-center gap-2"><Award className="h-4 w-4 text-gold" /> {t("authenticity_ai")}</div>
              <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-gold" /> {t("global_salon")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-20">
        <div className="text-center mb-12 animate-fade-up">
          <div className="font-serif-cap text-xs text-gold-dark mb-3 ornament inline-block">{t("departments")}</div>
          <h2 className="font-display text-4xl md:text-5xl">{t("cabinet_title")}</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {categories.map((c) => {
            const Icon = ICONS[c.icon || "Sparkles"] || Sparkles;
            return (
              <Link key={c.id} to={`/marketplace?category=${c.slug}`} className="frame-card p-6 text-center group">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold shadow-gold group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6 text-ink" />
                </div>
                <div className="font-display text-xl">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* DAILY POST */}
      {daily && (
        <section className="bg-gradient-parchment border-y border-border/60">
          <div className="container py-20 grid gap-10 md:grid-cols-2 items-center">
            <div className="relative aspect-[4/3] overflow-hidden shadow-deep">
              <img src={daily.image_url || dailyImg} alt={daily.title} loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="animate-fade-up">
              <div className="font-serif-cap text-xs text-gold-dark mb-3 flex items-center gap-3">
                <Scroll className="h-4 w-4" /> {t("daily_antique")} · {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}
              </div>
              <h2 className="font-display text-4xl md:text-5xl mb-5 leading-tight">{daily.title}</h2>
              <div className="gold-divider mb-5" />
              <p className="text-muted-foreground leading-relaxed text-lg">{daily.content}</p>
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="container py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="font-serif-cap text-xs text-gold-dark mb-2">{t("newly_curated")}</div>
            <h2 className="font-display text-4xl md:text-5xl">{t("featured_pieces")}</h2>
          </div>
          <Link to="/marketplace" className="hidden md:flex items-center gap-2 text-sm text-gold-dark hover:text-gold transition-colors">
            {t("view_all")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="frame-card p-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-gold mb-3" />
            <p className="font-display text-2xl mb-2">{t("vault_awaits")}</p>
            <p className="text-muted-foreground mb-5">{t("vault_awaits_sub")}</p>
            <Link to="/sell"><Button className="bg-gradient-gold text-ink shadow-gold">{t("list_antique")}</Button></Link>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* TRUST */}
      <section className="bg-gradient-noir text-primary-foreground py-20">
        <div className="container grid gap-10 md:grid-cols-3 text-center">
          {trustItems.map(({ icon: Icon, title, text }) => (
            <div key={title} className="animate-fade-up">
              <Icon className="mx-auto h-10 w-10 text-gold mb-4" />
              <h3 className="font-display text-2xl mb-2">{title}</h3>
              <p className="opacity-75 text-sm leading-relaxed max-w-xs mx-auto">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
