import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Upload, Verified, XCircle, Loader2, AlertTriangle, IdCard, BookOpen, ChevronLeft } from "lucide-react";

type Submission = {
  id: string;
  status: "pending" | "approved" | "rejected";
  document_type: string;
  extracted_name: string | null;
  extracted_nationality: string | null;
  extracted_expiry: string | null;
  rejection_reason: string | null;
  ai_confidence: number | null;
  created_at: string;
};

const Verification = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [docType, setDocType] = useState<"cin" | "passport" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);

  const refresh = async () => {
    if (!user) return;
    const [sub, pr] = await Promise.all([
      supabase.from("kyc_submissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("kyc_status,verified,nationality").eq("id", user.id).maybeSingle(),
    ]);
    setSubmissions((sub.data as any) || []);
    setProfile(pr.data);
  };
  useEffect(() => { refresh(); }, [user]);

  const submit = async () => {
    if (!user || !file || !docType) return;
    if (file.size > 8 * 1024 * 1024) {
      return toast({ title: "File too large", description: "Max 8 MB.", variant: "destructive" });
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase.functions.invoke("verify-kyc", {
        body: { documentPath: path, documentType: docType },
      });
      if (error) throw error;
      const result = data as any;
      if (result?.error) throw new Error(result.error);

      if (result?.status === "approved") {
        toast({ title: "Verified ✓", description: "Welcome to the Club. You can now sell, buy and chat." });
      } else if (result?.status === "rejected") {
        toast({ title: "Verification rejected", description: result?.rejection_reason || "Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Submitted", description: "Pending review." });
      }
      setFile(null);
      setDocType(null);
      await refresh();
    } catch (err: any) {
      toast({ title: "Verification failed", description: err?.message || "Try again later.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const status = profile?.kyc_status as string | undefined;
  const isVerified = status === "verified";
  const step = !docType ? 0 : !file ? 1 : 2;

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
      <section className="container py-12 max-w-3xl">
        <div className="font-serif-cap text-xs text-gold-dark mb-2">Identity verification</div>
        <h1 className="font-display text-4xl md:text-5xl mb-2">Prove your identity</h1>
        <p className="text-muted-foreground mb-8">
          Choose a document, upload a clear photo, and our AI verifies you instantly.
        </p>

        {isVerified ? (
          <div className="frame-card p-6 flex items-center gap-4 bg-gradient-parchment">
            <Verified className="h-10 w-10 text-gold" />
            <div>
              <div className="font-display text-2xl">You are verified</div>
              <div className="text-sm text-muted-foreground">Nationality on file: {profile?.nationality || "—"}</div>
            </div>
          </div>
        ) : (
          <div className="frame-card p-6 md:p-8 space-y-6">
            <div className="flex justify-between text-xs">
              {["Choose document", "Upload photo", "Submit"].map((label, i) => (
                <span key={label} className={i <= step ? "text-gold-dark font-medium" : "text-muted-foreground"}>
                  {i + 1}. {label}
                </span>
              ))}
            </div>

            {step === 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDocType("passport")}
                  className="frame-card p-6 flex flex-col items-center gap-3 hover:border-gold border-2 border-transparent transition-colors"
                >
                  <BookOpen className="h-8 w-8 text-gold" />
                  <span className="font-display text-lg">Passport</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDocType("cin")}
                  className="frame-card p-6 flex flex-col items-center gap-3 hover:border-gold border-2 border-transparent transition-colors"
                >
                  <IdCard className="h-8 w-8 text-gold" />
                  <span className="font-display text-lg">National ID Card (CIN)</span>
                </button>
              </div>
            )}

            {step >= 1 && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setDocType(null); setFile(null); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Change document type
                </button>
                <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border rounded-sm py-10 hover:border-gold transition-colors">
                  <Upload className="h-8 w-8 text-gold mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : `Click to upload your ${docType === "cin" ? "National ID Card" : "passport"} (JPG / PNG, max 8 MB)`}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>

                <div className="bg-secondary/40 border border-border/60 p-4 rounded-sm flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-gold-dark mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Your document is stored privately. Only you and our verification system can read it.
                  </p>
                </div>

                <Button onClick={submit} disabled={busy || !file} className="w-full bg-gradient-gold text-ink shadow-gold" size="lg">
                  {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : "Submit for verification"}
                </Button>
              </div>
            )}
          </div>
        )}

        {submissions.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-2xl mb-3">History</h2>
            <div className="space-y-2">
              {submissions.map((s) => (
                <div key={s.id} className="frame-card p-4 flex items-start gap-3">
                  {s.status === "approved" && <Verified className="h-5 w-5 text-gold mt-0.5" />}
                  {s.status === "rejected" && <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
                  {s.status === "pending" && <AlertTriangle className="h-5 w-5 text-gold-dark mt-0.5" />}
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{s.status} · {s.document_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.extracted_name && <>Name: {s.extracted_name} · </>}
                      {s.extracted_nationality && <>Nationality: {s.extracted_nationality} · </>}
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                    {s.rejection_reason && <div className="text-xs text-destructive mt-1">{s.rejection_reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
};

export default Verification;
