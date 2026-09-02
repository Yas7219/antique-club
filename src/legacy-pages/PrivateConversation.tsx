import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LockKeyhole, MapPin, Send, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  product: { id: string; title: string; price: number; currency: string; images: string[]; location: string | null };
  seller: { username: string; display_name: string | null; verified: boolean; avatar_url: string | null };
};

const PrivateConversation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { format } = useCurrency();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(`/messages/${id || ""}`)}`, { replace: true });
      return;
    }
    if (!id) return;

    let active = true;
    const db = supabase as any;

    const load = async () => {
      setLoading(true);
      const { data: thread, error } = await db
        .from("private_conversations")
        .select("id,buyer_id,seller_id,product_id")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      if (error || !thread) {
        setUnavailable(true);
        setLoading(false);
        return;
      }

      const [{ data: product }, { data: seller }, { data: initialMessages }] = await Promise.all([
        db.from("products").select("id,title,price,currency,images,location").eq("id", thread.product_id).maybeSingle(),
        db.from("profiles").select("username,display_name,verified,avatar_url").eq("id", thread.seller_id).maybeSingle(),
        db.from("private_messages").select("id,conversation_id,sender_id,content,image_url,created_at").eq("conversation_id", id).order("created_at", { ascending: true }).limit(300),
      ]);

      if (!active || !product || !seller) return;
      setConversation({ ...thread, product, seller });
      setMessages(initialMessages || []);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`private-messages-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `conversation_id=eq.${id}` }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [authLoading, id, navigate, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !user || !id || sending) return;
    setSending(true);
    const { data, error } = await (supabase as any)
      .from("private_messages")
      .insert({ conversation_id: id, sender_id: user.id, content: content.slice(0, 1000), image_url: null })
      .select("id,conversation_id,sender_id,content,image_url,created_at")
      .single();
    setSending(false);

    if (error) {
      toast({ title: "Message not sent", description: "Please try again.", variant: "destructive" });
      return;
    }
    setText("");
    if (data) setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data]);
  };

  if (authLoading || loading) return <div className="min-h-screen"><Navbar /><main className="container py-20"><div className="frame-card h-96 animate-pulse bg-secondary" /></main></div>;

  if (unavailable || !conversation) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex flex-1 items-center justify-center py-20 text-center">
        <div className="frame-card max-w-lg p-10">
          <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-gold-dark" />
          <h1 className="font-display text-4xl">Private conversation unavailable</h1>
          <p className="mt-3 text-muted-foreground">Only the buyer and seller can open this conversation.</p>
          <Button asChild className="mt-6"><Link to="/marketplace">Return to marketplace</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  const sellerName = conversation.seller.display_name || conversation.seller.username;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container flex-1 py-6 max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 text-gold-dark" /> Private buyer–seller conversation</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <aside className="frame-card h-fit overflow-hidden">
            <Link to={`/product/${conversation.product.id}`} className="block border-b border-border/60 p-4 hover:bg-secondary/50">
              <img src={conversation.product.images[0] || "/placeholder.svg"} alt={conversation.product.title} className="aspect-square w-full object-cover" />
              <h2 className="mt-3 font-display text-xl leading-tight">{conversation.product.title}</h2>
              <p className="mt-1 font-display text-xl text-gold-dark">{format(conversation.product.price, conversation.product.currency)}</p>
              {conversation.product.location && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{conversation.product.location}</p>}
            </Link>
            <div className="p-4">
              <p className="font-serif-cap text-[11px] text-gold-dark">Seller</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold font-display text-ink">{sellerName[0]?.toUpperCase()}</div>
                <div className="min-w-0"><p className="truncate font-medium">{sellerName}</p><p className="truncate text-xs text-muted-foreground">@{conversation.seller.username}</p></div>
                {conversation.seller.verified && <ShieldCheck className="ml-auto h-4 w-4 text-gold-dark" />}
              </div>
            </div>
          </aside>

          <section className="frame-card flex min-h-[70vh] flex-col overflow-hidden">
            <header className="border-b border-border/60 bg-gradient-parchment px-5 py-4">
              <p className="font-serif-cap text-[11px] text-gold-dark">Direct message</p>
              <h1 className="font-display text-2xl">{sellerName}</h1>
            </header>
            <div className="flex-1 overflow-y-auto bg-gradient-parchment p-5">
              {messages.length === 0 && (
                <div className="mx-auto max-w-md py-16 text-center">
                  <LockKeyhole className="mx-auto h-7 w-7 text-gold-dark" />
                  <h2 className="mt-3 font-display text-2xl">Start a private conversation</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ask the seller about provenance, condition, delivery, or arrange a private viewing. Only you and the seller can read these messages.</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-2.5 text-sm ${mine ? "bg-ink text-primary-foreground" : "border border-border/60 bg-card"}`}>
                        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                        <time className={`mt-1 block text-[10px] ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={bottomRef} />
            </div>
            <footer className="flex items-center gap-2 border-t border-border/60 bg-background p-3">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
                }}
                placeholder={`Message ${sellerName} privately…`}
                maxLength={1000}
                aria-label={`Private message to ${sellerName}`}
              />
              <Button onClick={send} disabled={sending || !text.trim()} className="bg-gradient-gold text-ink shadow-gold" aria-label="Send private message"><Send className="h-4 w-4" /></Button>
            </footer>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivateConversation;
