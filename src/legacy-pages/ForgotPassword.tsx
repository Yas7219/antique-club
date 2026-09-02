import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Crown, ArrowLeft } from "lucide-react";
import heroImg from "@/assets/hero-antiques.jpg";

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setSent(true);
    toast({ title: "Email sent", description: "Check your inbox to reset your password." });
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
            <h2 className="font-display text-5xl leading-tight mb-4">Forgot your password?</h2>
            <p className="opacity-75">We'll send you a secure link to set a new one.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-16 bg-background">
        <div className="w-full max-w-md">
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <h1 className="font-display text-4xl mb-1">Reset password</h1>
          <p className="text-muted-foreground mb-8">Enter the email tied to your account.</p>
          {sent ? (
            <div className="frame-card p-6 text-center">
              <p className="font-display text-2xl mb-2">Check your email</p>
              <p className="text-muted-foreground text-sm">If an account exists, a reset link has been sent.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fp-email">Email</Label>
                <Input id="fp-email" name="email" type="email" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-ink shadow-gold">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
