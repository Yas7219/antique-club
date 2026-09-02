import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Crown } from "lucide-react";
import heroImg from "@/assets/hero-antiques.jpg";

const signUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore"),
  display_name: z.string().trim().min(1).max(60),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/";

  useEffect(() => { if (user) navigate(returnTo, { replace: true }); }, [user, navigate, returnTo]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    toast({ title: "Welcome back", description: "The salon awaits." });
    navigate(returnTo, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get("email"), password: fd.get("password"),
      username: fd.get("username"), display_name: fd.get("display_name"),
    });
    if (!parsed.success) return toast({ title: "Invalid input", description: parsed.error.issues[0].message, variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email, password: parsed.data.password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
        data: { username: parsed.data.username, display_name: parsed.data.display_name },
      },
    });
    setLoading(false);
    if (error) return toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    toast({ title: "Welcome to the Club", description: "Your membership is active." });
    navigate(returnTo, { replace: true });
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
            <h2 className="font-display text-5xl leading-tight mb-4">Step into the salon of collectors.</h2>
            <p className="opacity-75">A private marketplace where every piece tells a story, and every member is verified.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-16 bg-background">
        <div className="w-full max-w-md">
          <h1 className="font-display text-4xl mb-1">Welcome</h1>
          <p className="text-muted-foreground mb-8">Sign in or create your collector account.</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Join</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div><Label htmlFor="si-email">Email</Label><Input id="si-email" name="email" type="email" required /></div>
                <div><Label htmlFor="si-pass">Password</Label><Input id="si-pass" name="password" type="password" required /></div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-ink shadow-gold">
                  {loading ? "Entering…" : "Enter the Club"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="su-username">Username</Label><Input id="su-username" name="username" required /></div>
                  <div><Label htmlFor="su-display">Display name</Label><Input id="su-display" name="display_name" required /></div>
                </div>
                <div><Label htmlFor="su-email">Email</Label><Input id="su-email" name="email" type="email" required /></div>
                <div><Label htmlFor="su-pass">Password</Label><Input id="su-pass" name="password" type="password" minLength={6} required /></div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-ink shadow-gold">
                  {loading ? "Creating…" : "Become a Collector"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
