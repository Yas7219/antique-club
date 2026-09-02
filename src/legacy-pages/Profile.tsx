import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard, { ProductCardData } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Verified, Star, Award } from "lucide-react";

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [pr, pl, rv] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("products").select("id,title,price,currency,era,location,images,category_slug").eq("seller_id", user.id),
        supabase.from("reviews").select("*, reviewer:reviewer_id(username,display_name)").eq("seller_id", user.id),
      ]);
      setProfile(pr.data); setProducts((pl.data as any) || []); setReviews((rv.data as any) || []);
    })();
  }, [user]);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({
      display_name: String(fd.get("display_name")).slice(0, 60),
      bio: String(fd.get("bio")).slice(0, 500),
      location: String(fd.get("location")).slice(0, 100),
      phone: String(fd.get("phone")).slice(0, 30),
    }).eq("id", user.id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Profile updated" });
  };

  if (!profile) return <div className="min-h-screen"><Navbar /><div className="container py-20 animate-shimmer h-64" /></div>;

  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-gradient-noir text-primary-foreground py-12">
        <div className="container flex flex-wrap items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-gradient-gold flex items-center justify-center font-display text-4xl text-ink shadow-gold">
            {(profile.display_name || profile.username)[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-4xl">{profile.display_name || profile.username}</h1>
              {profile.verified && <Verified className="h-6 w-6 text-gold" />}
            </div>
            <div className="opacity-70 text-sm">@{profile.username}</div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5 font-serif-cap text-xs text-gold"><Award className="h-4 w-4" /> {profile.level}</span>
              <span className="flex items-center gap-1.5 font-serif-cap text-xs text-gold"><Star className="h-4 w-4" /> {avg} ({reviews.length})</span>
              <span className="font-serif-cap text-xs opacity-60">{products.length} listings</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-10 grid gap-10 lg:grid-cols-[2fr,1fr]">
        <div>
          <h2 className="font-display text-3xl mb-5">Your listings</h2>
          {products.length === 0 ? (
            <div className="frame-card p-10 text-center">
              <p className="text-muted-foreground mb-4">You haven't listed any pieces yet.</p>
              <Button onClick={() => navigate("/sell")} className="bg-gradient-gold text-ink shadow-gold">List your first antique</Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}

          <h2 className="font-display text-3xl mt-12 mb-5">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="frame-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{r.reviewer?.display_name || r.reviewer?.username}</div>
                    <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold text-gold" />)}</div>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={save} className="frame-card p-6 h-fit">
          <h3 className="font-display text-2xl mb-4">Edit profile</h3>
          <div className="space-y-3">
            <div><Label>Display name</Label><Input name="display_name" defaultValue={profile.display_name || ""} maxLength={60} /></div>
            <div><Label>Bio</Label><Textarea name="bio" defaultValue={profile.bio || ""} rows={3} maxLength={500} /></div>
            <div><Label>Location</Label><Input name="location" defaultValue={profile.location || ""} maxLength={100} /></div>
            <div><Label>Phone (visible to buyers)</Label><Input name="phone" defaultValue={profile.phone || ""} maxLength={30} /></div>
            <Button type="submit" className="w-full bg-ink text-primary-foreground">Save</Button>
          </div>
        </form>
      </section>
      <Footer />
    </div>
  );
};

export default Profile;
