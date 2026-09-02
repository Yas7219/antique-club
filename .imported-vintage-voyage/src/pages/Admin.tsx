import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, XCircle, Verified, Loader2, Trash2, EyeOff, Eye } from "lucide-react";

type KycRow = {
  id: string;
  user_id: string;
  document_type: string;
  status: "pending" | "approved" | "rejected";
  extracted_name: string | null;
  extracted_nationality: string | null;
  extracted_expiry: string | null;
  ai_confidence: number | null;
  rejection_reason: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: "active" | "sold" | "pending";
  seller_id: string;
  category_slug: string | null;
  created_at: string;
};

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [kyc, setKyc] = useState<KycRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return navigate("/auth");
    if (!isAdmin) return navigate("/");
  }, [user, authLoading, isAdmin, roleLoading, navigate]);

  const refresh = async () => {
    const [k, p] = await Promise.all([
      supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,title,price,currency,status,seller_id,category_slug,created_at").order("created_at", { ascending: false }),
    ]);
    setKyc((k.data as any) || []);
    setProducts((p.data as any) || []);
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const decideKyc = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    const { error } = await supabase
      .from("kyc_submissions")
      .update({ status, rejection_reason: status === "rejected" ? "Reviewed and rejected by moderation team." : null })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: status === "approved" ? "Approved" : "Rejected" });
    refresh();
  };

  const toggleListing = async (p: ProductRow) => {
    setBusyId(p.id);
    const next = p.status === "active" ? "pending" : "active";
    const { error } = await supabase.from("products").update({ status: next }).eq("id", p.id);
    setBusyId(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    refresh();
  };

  const deleteListing = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setBusyId(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Listing removed" });
    refresh();
  };

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const pendingKyc = kyc.filter((k) => k.status === "pending");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="container py-12 max-w-5xl">
        <div className="font-serif-cap text-xs text-gold-dark mb-2">Moderation</div>
        <h1 className="font-display text-4xl md:text-5xl mb-8">Admin dashboard</h1>

        <Tabs defaultValue="kyc">
          <TabsList>
            <TabsTrigger value="kyc">
              KYC submissions {pendingKyc.length > 0 && <Badge className="ml-2 bg-gold text-ink">{pendingKyc.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="space-y-3 mt-6">
            {kyc.length === 0 && <p className="text-muted-foreground text-sm">No submissions yet.</p>}
            {kyc.map((k) => (
              <div key={k.id} className="frame-card p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-sm font-medium capitalize flex items-center gap-2">
                    {k.status === "approved" && <Verified className="h-4 w-4 text-gold" />}
                    {k.status === "rejected" && <XCircle className="h-4 w-4 text-destructive" />}
                    {k.status} · {k.document_type}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {k.extracted_name && <>Name: {k.extracted_name} · </>}
                    {k.extracted_nationality && <>Nationality: {k.extracted_nationality} · </>}
                    {k.ai_confidence != null && <>Confidence: {Math.round(k.ai_confidence * 100)}% · </>}
                    {new Date(k.created_at).toLocaleString()}
                  </div>
                  {k.rejection_reason && <div className="text-xs text-destructive mt-1">{k.rejection_reason}</div>}
                </div>
                {k.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === k.id}
                      onClick={() => decideKyc(k.id, "approved")}
                      className="bg-gradient-gold text-ink shadow-gold"
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" disabled={busyId === k.id} onClick={() => decideKyc(k.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="listings" className="space-y-3 mt-6">
            {products.length === 0 && <p className="text-muted-foreground text-sm">No listings yet.</p>}
            {products.map((p) => (
              <div key={p.id} className="frame-card p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.price} {p.currency} · {p.category_slug || "uncategorized"} ·{" "}
                    <span className="capitalize">{p.status}</span> · {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === p.id} onClick={() => toggleListing(p)}>
                    {p.status === "active" ? (
                      <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-1" /> Publish</>
                    )}
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busyId === p.id} onClick={() => deleteListing(p.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </section>
      <Footer />
    </div>
  );
};

export default Admin;
