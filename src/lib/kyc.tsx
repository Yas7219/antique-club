import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

interface KycContextValue {
  status: "loading" | "none" | "pending" | "verified" | "rejected";
  refresh: () => Promise<void>;
  /** Returns true if the action can proceed. If not, it triggers the gating modal/redirect. */
  requireVerified: (intent?: string) => boolean;
}

import { createContext, useContext } from "react";

const KycContext = createContext<KycContextValue>({
  status: "loading",
  refresh: async () => {},
  requireVerified: () => false,
});

export const KycProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<KycContextValue["status"]>("loading");
  const [gateOpen, setGateOpen] = useState(false);

  const refresh = async () => {
    if (!user) { setStatus("none"); return; }
    const { data } = await supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle();
    const s = (data?.kyc_status as string) || "none";
    setStatus(s === "verified" ? "verified" : s === "pending" ? "pending" : s === "rejected" ? "rejected" : "none");
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [user, authLoading]);

  const requireVerified = (_intent?: string) => {
    if (!user) {
      navigate("/auth");
      return false;
    }
    if (status === "verified") return true;
    setGateOpen(true);
    return false;
  };

  return (
    <KycContext.Provider value={{ status, refresh, requireVerified }}>
      {children}
      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <ShieldCheck className="h-6 w-6 text-gold" /> Verification required
            </DialogTitle>
            <DialogDescription className="pt-2">
              To buy, sell, or chat in the salon you must verify your identity with a National ID Card or Passport.
              This keeps the Club safe for every collector.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGateOpen(false)}>Later</Button>
            <Button
              className="bg-gradient-gold text-ink shadow-gold"
              onClick={() => { setGateOpen(false); navigate("/verify"); }}
            >
              Verify now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KycContext.Provider>
  );
};

export const useKyc = () => useContext(KycContext);
