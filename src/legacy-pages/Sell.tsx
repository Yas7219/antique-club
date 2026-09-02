import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useKyc } from "@/lib/kyc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Upload, ShieldCheck, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { z } from "zod";
import { CURRENCY_LIST } from "@/lib/currency";

const ERAS = ["Antiquity", "Medieval", "Renaissance", "18th century", "19th century", "20th century"];
const STEPS = ["Photos", "Details", "Review"] as const;

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  price: z.number().positive().max(100000000),
});

const Sell = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { status: kycStatus } = useKyc();
  const [cats, setCats] = useState<{ name: string; slug: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    title: "", description: "", location: "", price: "", currency: "MAD",
    category: "others", era: "19th century", condition: "Good",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);
  useEffect(() => { supabase.from("categories").select("name,slug").then(({ data }) => setCats(data || [])); }, []);

  const canLeavePhotos = files.length > 0;
  const detailsCheck = schema.safeParse({ title: form.title, description: form.description, price: Number(form.price) });
  const canLeaveDetails = detailsCheck.success;

  const next = () => {
    if (step === 0 && !canLeavePhotos) return toast({ title: "Add at least one photo", variant: "destructive" });
    if (step === 1 && !canLeaveDetails) return toast({ title: "Invalid", description: detailsCheck.success ? undefined : detailsCheck.error.issues[0].message, variant: "destructive" });
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handlePublish = async () => {
    if (!user) return;
    if (kycStatus !== "verified") {
      toast({ title: "Verification required", description: "Verify your identity to list pieces.", variant: "destructive" });
      navigate("/verify");
      return;
    }
    const parsed = schema.safeParse({ title: form.title, description: form.description, price: Number(form.price) });
    if (!parsed.success) return toast({ title: "Invalid", description: parsed.error.issues[0].message, variant: "destructive" });
    setBusy(true);

    const urls: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("antiques").upload(path, file);
      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setBusy(false); return; }
      const { data: pub } = supabase.storage.from("antiques").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }

    // Tiny "AI simulation"
    const origins = ["Roman", "Islamic Golden Age", "Victorian England", "Ming Dynasty", "Ottoman", "Greek Classical", "Egyptian"];
    const auth = ["Likely authentic (87% confidence)", "Probable reproduction (62%)", "Authentic period piece (94%)", "Inconclusive — expert review advised"];
    const ai_origin = origins[Math.floor(Math.random() * origins.length)];
    const ai_authenticity = auth[Math.floor(Math.random() * auth.length)];

    const { error } = await supabase.from("products").insert({
      seller_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      currency: form.currency,
      category_slug: form.category,
      era: form.era,
      condition: form.condition,
      location: form.location,
      images: urls,
      ai_origin, ai_authenticity,
    });
    setBusy(false);
    if (error) return toast({ title: "Listing failed", description: error.message, variant: "destructive" });
    toast({ title: "Listed!", description: "Your piece is now in the salon." });
    navigate("/marketplace");
  };

  const categoryName = cats.find((c) => c.slug === form.category)?.name || form.category;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-12 max-w-3xl">
        <div className="font-serif-cap text-xs text-gold-dark mb-2">List your piece</div>
        <h1 className="font-display text-4xl md:text-5xl mb-2">Bring an antique to the salon</h1>
        <p className="text-muted-foreground mb-6">Three quick steps: photos, details, then review.</p>

        <div className="mb-8">
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          <div className="flex justify-between mt-2 text-xs">
            {STEPS.map((label, i) => (
              <span key={label} className={i <= step ? "text-gold-dark font-medium" : "text-muted-foreground"}>
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>

        {kycStatus !== "verified" && (
          <div className="frame-card p-5 mb-6 flex items-start gap-3 bg-gradient-parchment">
            <ShieldCheck className="h-6 w-6 text-gold-dark mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-display text-lg">Verification required to sell</div>
              <p className="text-sm text-muted-foreground">Verify your identity (CIN or Passport) to publish pieces.</p>
            </div>
            <Button onClick={() => navigate("/verify")} size="sm" className="bg-gradient-gold text-ink shadow-gold">Verify</Button>
          </div>
        )}

        <div className="frame-card p-6 md:p-8 space-y-5">
          {step === 0 && (
            <div className="space-y-4">
              <Label>Photographs</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border rounded-sm py-10 hover:border-gold transition-colors">
                <Upload className="h-8 w-8 text-gold mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload up to 5 images</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
              </label>
              {files.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative aspect-square bg-secondary text-xs flex items-center justify-center p-1 truncate">
                      {f.name}
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-ink text-primary-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Good lighting and multiple angles help buyers trust the listing.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="18th century French gilt mirror" /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Marrakech, Morocco" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={5} maxLength={2000} placeholder="Provenance, condition, dimensions, history…" /></div>
              <div className="grid md:grid-cols-4 gap-4">
                <div><Label>Price</Label><Input type="number" min="1" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
                <div>
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CURRENCY_LIST.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Era</Label>
                  <Select value={form.era} onValueChange={(v) => set("era", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ERAS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {files.map((f, i) => <div key={i} className="aspect-square bg-secondary text-xs flex items-center justify-center p-1 truncate">{f.name}</div>)}
              </div>
              <div className="text-sm space-y-1">
                <div className="font-display text-xl">{form.title}</div>
                <div className="text-muted-foreground">{form.description}</div>
                <div>{form.price} {form.currency} · {categoryName} · {form.era} · {form.condition}</div>
                {form.location && <div className="text-muted-foreground">{form.location}</div>}
              </div>
              <div className="bg-gradient-parchment p-4 border border-border/60 rounded-sm flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-gold-dark mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">After listing, our AI will analyze your photo and estimate the origin and authenticity of the piece.</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next} className="bg-gradient-gold text-ink shadow-gold">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="button" onClick={handlePublish} disabled={busy} className="bg-gradient-gold text-ink shadow-gold">
                {busy ? "Listing…" : "Publish to the Salon"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Sell;
