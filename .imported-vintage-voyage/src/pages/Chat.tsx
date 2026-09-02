import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useKyc } from "@/lib/kyc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Send, Verified, Globe, Languages, Video, Phone, X, PhoneOff, Sparkles, Armchair, Coins, Watch, Palette, BookOpen, Gem, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage, LANGS } from "@/lib/language";

interface Room { id: string; slug: string; name: string; description: string | null; icon: string | null; sort_order: number; }
interface Msg {
  id: string; sender_id: string; content: string | null; image_url: string | null; created_at: string; room_id: string;
  profiles?: { username: string; display_name: string | null; verified: boolean };
}

const ICONS: Record<string, any> = { Globe, Armchair, Coins, Watch, Palette, BookOpen, Gem, Sparkles };

const Chat = () => {
  const { user } = useAuth();
  const { requireVerified } = useKyc();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const { lang: targetLang, setLang: setTargetLang } = useLanguage();
  const [callUrl, setCallUrl] = useState<string | null>(null);
  const [callType, setCallType] = useState<"video" | "audio">("video");
  const [creatingCall, setCreatingCall] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load rooms
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("chat_rooms").select("*").order("sort_order");
      const list = (data as Room[]) || [];
      setRooms(list);
      if (list.length && !activeRoom) {
        const saved = localStorage.getItem("activeRoomSlug");
        const found = saved ? list.find((r) => r.slug === saved) : null;
        setActiveRoom(found || list[0]);
      }
    })();
  }, []);

  // Load + subscribe messages for active room
  useEffect(() => {
    if (!activeRoom) return;
    localStorage.setItem("activeRoomSlug", activeRoom.slug);
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(username,display_name,verified)")
        .eq("room_id", activeRoom.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) setMsgs((data as any) || []);
    })();

    const channel = supabase
      .channel(`messages-${activeRoom.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` },
        async (payload) => {
          const { data } = await supabase.from("profiles").select("username,display_name,verified").eq("id", (payload.new as any).sender_id).maybeSingle();
          setMsgs((m) => [...m, { ...(payload.new as any), profiles: data || undefined }]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const requireAuth = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Join the Club to participate." });
      return false;
    }
    if (!requireVerified()) return false;
    return true;
  };

  const send = async (image_url: string | null = null) => {
    if (!requireAuth() || !activeRoom) return;
    if (!text.trim() && !image_url) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user!.id,
      room_id: activeRoom.id,
      content: text.trim().slice(0, 1000) || null,
      image_url,
    });
    setSending(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setText("");
  };

  const uploadImage = async (file: File) => {
    if (!requireAuth()) return;
    const path = `${user!.id}/chat/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("antiques").upload(path, file);
    if (error) return toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    const { data } = supabase.storage.from("antiques").getPublicUrl(path);
    await send(data.publicUrl);
  };

  const translate = async (m: Msg) => {
    if (!m.content) return;
    if (translations[m.id]) {
      // toggle off
      setTranslations((t) => { const n = { ...t }; delete n[m.id]; return n; });
      return;
    }
    setTranslating((t) => ({ ...t, [m.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { text: m.content, target: targetLang },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTranslations((t) => ({ ...t, [m.id]: (data as any).translation }));
    } catch (e: any) {
      toast({ title: "Translation failed", description: e?.message || "Try again later", variant: "destructive" });
    } finally {
      setTranslating((t) => { const n = { ...t }; delete n[m.id]; return n; });
    }
  };

  const startCall = async (type: "video" | "audio") => {
    if (!requireAuth() || !activeRoom) return;
    setCreatingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-call-room", {
        body: { roomSlug: activeRoom.slug, callType: type },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCallType(type);
      setCallUrl((data as any).url);
    } catch (e: any) {
      toast({
        title: "Call unavailable",
        description: e?.message?.includes("DAILY_API_KEY")
          ? "Voice/video calls need Daily.co setup. Ask admin to add DAILY_API_KEY."
          : (e?.message || "Try again later"),
        variant: "destructive",
      });
    } finally {
      setCreatingCall(false);
    }
  };

  const callIframeUrl = useMemo(() => {
    if (!callUrl) return null;
    const params = new URLSearchParams({
      userName: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Collector",
    });
    return `${callUrl}?${params.toString()}`;
  }, [callUrl, user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <section className="container py-6 flex-1 flex flex-col max-w-7xl">
        <div className="mb-4">
          <div className="font-serif-cap text-xs text-gold-dark mb-1 flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Global Salons</div>
          <h1 className="font-display text-4xl">The Salon</h1>
          <p className="text-muted-foreground text-sm">Where collectors gather. Pick a room, share finds, translate, and call.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[240px,1fr] flex-1 min-h-[70vh]">
          {/* Rooms sidebar */}
          <aside className="frame-card p-3 h-fit md:sticky md:top-24">
            <div className="font-serif-cap text-[11px] text-gold-dark px-2 pb-2">Rooms</div>
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {rooms.map((r) => {
                const Icon = ICONS[r.icon || "Globe"] || Globe;
                const active = activeRoom?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoom(r)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-left text-sm transition-all whitespace-nowrap ${
                      active ? "bg-gradient-noir text-primary-foreground" : "hover:bg-secondary/70 text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold" : "text-gold-dark"}`} />
                    <span className="font-medium truncate">{r.name}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Chat panel */}
          <div className="frame-card flex flex-col overflow-hidden min-h-[70vh]">
            {activeRoom && (
              <div className="border-b border-border/60 px-5 py-3 flex items-center gap-3 bg-gradient-parchment">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xl truncate">{activeRoom.name}</div>
                  {activeRoom.description && <div className="text-xs text-muted-foreground truncate">{activeRoom.description}</div>}
                </div>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger className="h-9 w-[120px] text-xs"><Languages className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={creatingCall} onClick={() => startCall("audio")} title="Voice call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" disabled={creatingCall} onClick={() => startCall("video")} className="bg-gradient-gold text-ink shadow-gold" title="Video call">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-parchment">
              {msgs.length === 0 && <p className="text-center text-muted-foreground py-12">Be the first to greet the salon.</p>}
              {msgs.map((m) => {
                const mine = m.sender_id === user?.id;
                const tr = translations[m.id];
                return (
                  <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                    <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-gold flex items-center justify-center font-display text-ink text-sm">
                      {(m.profiles?.display_name || m.profiles?.username || "?")[0]?.toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                      <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        {m.profiles?.display_name || m.profiles?.username || "Anonymous"}
                        {m.profiles?.verified && <Verified className="h-3 w-3 text-gold" />}
                      </div>
                      <div className={`px-4 py-2.5 rounded-sm ${mine ? "bg-ink text-primary-foreground" : "bg-card border border-border/60"}`}>
                        {m.image_url && <img src={m.image_url} alt="" className="max-w-xs mb-2 rounded-sm" />}
                        {m.content && <p className="whitespace-pre-wrap text-sm">{m.content}</p>}
                        {tr && (
                          <div className={`mt-2 pt-2 border-t text-sm italic ${mine ? "border-primary-foreground/20" : "border-border"}`}>
                            <div className={`font-serif-cap text-[10px] mb-0.5 ${mine ? "text-gold" : "text-gold-dark"}`}>Translation · {LANGS.find((l) => l.code === targetLang)?.label}</div>
                            {tr}
                          </div>
                        )}
                      </div>
                      {m.content && (
                        <button
                          onClick={() => translate(m)}
                          disabled={translating[m.id]}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-gold-dark hover:text-gold disabled:opacity-50"
                        >
                          <Languages className="h-3 w-3" />
                          {translating[m.id] ? "Translating…" : tr ? "Hide translation" : "Translate"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border/60 p-3 flex items-center gap-2 bg-background">
              {user ? (
                <>
                  <label className="cursor-pointer p-2 text-muted-foreground hover:text-gold-dark">
                    <ImageIcon className="h-5 w-5" />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                  <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Speak to the salon…" maxLength={1000} />
                  <Button onClick={() => send()} disabled={sending || !text.trim()} className="bg-gradient-gold text-ink shadow-gold">
                    <Send className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-between gap-3 px-2">
                  <span className="text-sm text-muted-foreground">Sign in to send messages and join calls.</span>
                  <Link to="/auth"><Button size="sm" className="bg-gradient-gold text-ink shadow-gold">Join the Club</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Call Dialog */}
      <Dialog open={!!callUrl} onOpenChange={(o) => !o && setCallUrl(null)}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b border-border/60 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              {callType === "video" ? <Video className="h-5 w-5 text-gold-dark" /> : <Phone className="h-5 w-5 text-gold-dark" />}
              {callType === "video" ? "Video" : "Voice"} Call · {activeRoom?.name}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={() => setCallUrl(null)}>
              <PhoneOff className="h-4 w-4 mr-1" /> Leave
            </Button>
          </DialogHeader>
          {callIframeUrl && (
            <iframe
              src={callIframeUrl}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              className="w-full h-full border-0"
              title="Daily.co call"
            />
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Chat;
