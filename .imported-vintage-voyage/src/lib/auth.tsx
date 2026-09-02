import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Supabase fires an INITIAL_SESSION event as soon as we subscribe, carrying
    // the persisted session once it's been read from storage — so this single
    // listener is enough to both hydrate the session AND know when auth has
    // finished initializing. We previously *also* called getSession() separately
    // and let it race against this listener: if the listener's initial event
    // resolved a beat before getSession()'s promise, `loading` could already be
    // false while a stale/empty session briefly overwrote a valid one, which is
    // what caused protected pages (Verify, Sell, ...) to bounce back to /auth
    // right after opening them. Using only onAuthStateChange removes that race.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      // TEMP DEBUG - remove after diagnosing
      console.log("[DEBUG] AUTH EVENT:", _event, "| has session:", !!s, "| user:", s?.user?.email);
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
