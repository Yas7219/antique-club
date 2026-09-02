import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, target } = await req.json();
    if (!text || typeof text !== "string" || text.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ALLOWED = ["en","fr","ar","es","de","it","pt","ru","zh","ja","ko","tr","nl","pl","sv","hi","fa","ur"];
    if (target === "he" || target === "iw" || target === "hebrew") {
      return new Response(JSON.stringify({ error: "Language not supported." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetLang = ALLOWED.includes(target) ? target : "en";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const NAMES: Record<string,string> = { en:"English", fr:"French", ar:"Arabic", es:"Spanish", de:"German", it:"Italian", pt:"Portuguese", ru:"Russian", zh:"Chinese (Simplified)", ja:"Japanese", ko:"Korean", tr:"Turkish", nl:"Dutch", pl:"Polish", sv:"Swedish", hi:"Hindi", fa:"Persian", ur:"Urdu" };
    const langName = NAMES[targetLang];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You are a translator. Translate the user's message to ${langName}. Output ONLY the translation, no quotes, no explanation. Preserve names, prices, and proper nouns.` },
          { role: "user", content: text },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "Translation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const translation = data?.choices?.[0]?.message?.content?.trim() || text;
    return new Response(JSON.stringify({ translation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
