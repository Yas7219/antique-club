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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("wishlist")
        .select("products(id,title,price,currency,era,location,images,category_slug,profiles(username,verified))")
        .eq("user_id", user.id);
      setItems(((data || []).map((d: any) => d.products).filter(Boolean)) as any);
    })();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="container py-12">
        <div className="font-serif-cap text-xs text-gold-dark mb-2 flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> Saved pieces</div>
        <h1 className="font-display text-5xl mb-8">Your Cabinet</h1>
        {!user && !loading ? (
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
