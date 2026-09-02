import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Bell, BellRing } from "lucide-react";
import { categoryLabel, useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const ERA_KEYS = ["Antiquity", "Medieval", "Renaissance", "18th century", "19th century", "20th century"];

const Marketplace = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { category: routeCategory } = useParams<{ category?: string }>();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedSlugs, setFollowedSlugs] = useState<Set<string>>(new Set());

  const category = routeCategory || params.get("category") || "all";
  const era = params.get("era") || "All eras";
  const q = params.get("q") || "";
  const sort = params.get("sort") || "new";
  const minPrice = params.get("min") || "";
  const maxPrice = params.get("max") || "";

  useEffect(() => {
    supabase.from("categories").select("name,slug").then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => {
    if (!user) { setFollowedSlugs(new Set()); return; }
    supabase.from("category_follows").select("category_slug").eq("user_id", user.id).then(({ data }) => {
      setFollowedSlugs(new Set((data || []).map((r: any) => r.category_slug)));
    });
  }, [user]);

  const toggleFollow = async (slug: string) => {
    if (!user) return toast({ title: t("nav_enter_club"), description: "Sign in to follow a category." });
    const isFollowing = followedSlugs.has(slug);
    setFollowedSlugs((prev) => {
      const next = new Set(prev);
      isFollowing ? next.delete(slug) : next.add(slug);
      return next;
    });
    if (isFollowing) {
      await supabase.from("category_follows").delete().eq("user_id", user.id).eq("category_slug", slug);
      toast({ title: "Unfollowed category" });
    } else {
      await supabase.from("category_follows").insert({ user_id: user.id, category_slug: slug });
      toast({ title: "Following category", description: "We'll notify you about new pieces here." });
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from("products")
        .select("id,title,price,currency,era,location,images,category_slug")
        .eq("status", "active");
      if (category !== "all") query = query.eq("category_slug", category);
      if (era !== "All eras") query = query.eq("era", era);
      if (q) query = query.ilike("title", `%${q}%`);
      if (minPrice) query = query.gte("price", Number(minPrice));
      if (maxPrice) query = query.lte("price", Number(maxPrice));
      if (sort === "new") query = query.order("created_at", { ascending: false });
      if (sort === "low") query = query.order("price", { ascending: true });
      if (sort === "high") query = query.order("price", { ascending: false });
      const { data } = await query.limit(60);
      setProducts((data as any) || []);
      setLoading(false);
    })();
  }, [category, era, q, sort, minPrice, maxPrice]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === "all" || v === "All eras") next.delete(k); else next.set(k, v);
    setParams(next);
  };

  const heading = useMemo(() => {
    if (category === "all") return t("full_marketplace");
    return categoryLabel(category, lang, categories.find((c) => c.slug === category)?.name) || t("marketplace_label");
  }, [category, categories, t]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="bg-gradient-noir text-primary-foreground py-14">
        <div className="container">
          <div className="font-serif-cap text-xs text-gold mb-3">{t("marketplace_label")}</div>
          <h1 className="font-display text-5xl md:text-6xl mb-4">{heading}</h1>
          <p className="opacity-70 max-w-2xl">{t("marketplace_subtitle")}</p>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-4 md:grid-cols-[1fr,auto,auto,auto,auto] mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder={t("search_placeholder")} defaultValue={q}
              onKeyDown={(e) => e.key === "Enter" && setParam("q", (e.target as HTMLInputElement).value)} />
          </div>
          <Select value={category} onValueChange={(v) => setParam("category", v)}>
            <SelectTrigger className="md:w-44"><SelectValue placeholder={t("all_categories")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_categories")}</SelectItem>
              {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {category !== "all" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleFollow(category)}
              className={followedSlugs.has(category) ? "border-gold text-gold-dark" : ""}
            >
              {followedSlugs.has(category) ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {followedSlugs.has(category) ? "Following" : "Follow category"}
            </Button>
          )}
          <Select value={era} onValueChange={(v) => setParam("era", v)}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder={t("all_eras")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All eras">{t("all_eras")}</SelectItem>
              {ERA_KEYS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input className="w-24" placeholder={t("min_price")} type="number" defaultValue={minPrice} onBlur={(e) => setParam("min", e.target.value)} />
            <Input className="w-24" placeholder={t("max_price")} type="number" defaultValue={maxPrice} onBlur={(e) => setParam("max", e.target.value)} />
          </div>
          <Select value={sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{t("newest_first")}</SelectItem>
              <SelectItem value="low">{t("price_low_high")}</SelectItem>
              <SelectItem value="high">{t("price_high_low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-secondary animate-shimmer" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="frame-card p-16 text-center">
            <SlidersHorizontal className="mx-auto h-10 w-10 text-gold mb-3" />
            <p className="font-display text-2xl">{t("no_pieces_match")}</p>
            <p className="text-muted-foreground">{t("try_widening")}</p>
            <Button className="mt-5" variant="outline" onClick={() => setParams(new URLSearchParams())}>{t("reset_filters")}</Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default Marketplace;
