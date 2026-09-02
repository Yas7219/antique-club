import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";
import heroImg from "@/assets/hero-antiques.jpg";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-parses the recovery hash and creates a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    const confirm = String(fd.get("confirm"));
    if (password.length < 6) return toast({ title: "Weak password", description: "At least 6 characters.", variant: "destructive" });
    if (password !== confirm) return toast({ title: "Passwords don't match", variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Password updated", description: "You are now signed in." });
    navigate("/");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:block bg-gradient-noir">
        <img src={heroImg} alt="Antique cabinet" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/60 to-ink" />
        <div className="relative h-full flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-gold" />
            <span className="font-display text-3xl">Antique<span className="text-gold">Club</span></span>
          </div>
          <div className="max-w-md">
            <h2 className="font-display text-5xl leading-tight mb-4">Set a new password</h2>
            <p className="opacity-75">Choose a strong one — this key opens the salon.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-16 bg-background">
        <div className="w-full max-w-md">
          <h1 className="font-display text-4xl mb-1">New password</h1>
          <p className="text-muted-foreground mb-8">Enter and confirm your new password.</p>
          {!ready ? (
            <div className="frame-card p-6 text-center text-muted-foreground text-sm">
              Open the reset link from your email to continue.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="np">New password</Label><Input id="np" name="password" type="password" minLength={6} required /></div>
              <div><Label htmlFor="cp">Confirm password</Label><Input id="cp" name="confirm" type="password" minLength={6} required /></div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-ink shadow-gold">
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
