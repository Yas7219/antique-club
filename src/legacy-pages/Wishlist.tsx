import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const Wishlist = () => {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setItems([]);
      setLoadError(false);
      setLoadingItems(false);
      return () => { active = false; };
    }

    setLoadingItems(true);
    setLoadError(false);
    (async () => {
      // Load the join rows first. This avoids relying on a generated nested
      // relation name, which can return an empty result even when the save succeeded.
      const { data: savedRows, error: savedError } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user.id);

      if (!active) return;
      if (savedError) {
        setLoadError(true);
        setLoadingItems(false);
        return;
      }
      const productIds = (savedRows || []).map((row) => row.product_id).filter(Boolean);
      if (productIds.length === 0) {
        setItems([]);
        setLoadingItems(false);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id,title,price,currency,era,location,images,category_slug,seller_id")
        .in("id", productIds)
        .eq("status", "active");

      if (!active) return;
      if (productsError) {
        setLoadError(true);
        setLoadingItems(false);
        return;
      }

      const sellerIds = [...new Set((products || []).map((product) => product.seller_id).filter(Boolean))];
      const { data: profiles } = sellerIds.length
        ? await supabase.from("profiles").select("id,username,verified").in("id", sellerIds)
        : { data: [] };
      const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
      const orderedProducts = productIds
        .map((productId) => (products || []).find((product) => product.id === productId))
        .filter(Boolean)
        .map((product) => ({ ...product, profiles: profileById.get(product.seller_id) || null }));

      if (active) {
        setItems(orderedProducts as ProductCardData[]);
        setLoadingItems(false);
      }
    })();

    return () => { active = false; };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="container py-12">
        <div className="font-serif-cap text-xs text-gold-dark mb-2 flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> Saved pieces</div>
        <h1 className="font-display text-5xl mb-8">Your Cabinet</h1>
        {loading || loadingItems ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="frame-card aspect-[4/5] animate-pulse bg-secondary" />)}
          </div>
        ) : loadError ? (
          <div className="frame-card p-16 text-center">
            <p className="font-display text-2xl mb-2">Could not load your cabinet</p>
            <p className="text-muted-foreground">Please refresh the page and try again.</p>
          </div>
        ) : !user ? (
          <div className="frame-card p-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-burgundy mb-3" />
            <p className="font-display text-2xl mb-2">Sign in to access your cabinet</p>
            <p className="text-muted-foreground mb-5">Save and revisit your favorite pieces.</p>
            <Link to="/auth"><Button className="bg-gradient-gold text-ink shadow-gold">Join the Club</Button></Link>
          </div>
        ) : items.length === 0 ? (
          <div className="frame-card p-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-burgundy mb-3" />
            <p className="font-display text-2xl">Your cabinet is empty</p>
            <p className="text-muted-foreground">Tap the heart on any piece to save it here.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default Wishlist;
