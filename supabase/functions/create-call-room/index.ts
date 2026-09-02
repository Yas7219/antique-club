import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({ error: "Daily.co API key not configured. Add DAILY_API_KEY secret." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { roomSlug, callType } = await req.json();
    if (!roomSlug || typeof roomSlug !== "string") {
      return new Response(JSON.stringify({ error: "Invalid roomSlug" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const type = callType === "audio" ? "audio" : "video";

    // Look up chat room
    const { data: chatRoom } = await supa.from("chat_rooms").select("id,name").eq("slug", roomSlug).maybeSingle();
    if (!chatRoom) {
      return new Response(JSON.stringify({ error: "Room not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse active room if exists
    const { data: existing } = await supa
      .from("video_rooms")
      .select("*")
      .eq("room_id", chatRoom.id)
      .eq("active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ url: existing.daily_url, name: existing.daily_name, callType: existing.call_type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Daily.co room
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 2;
    const dailyResp = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          exp,
          enable_chat: false,
          enable_screenshare: type === "video",
          start_video_off: type === "audio",
          start_audio_off: false,
          max_participants: 20,
        },
      }),
    });

    if (!dailyResp.ok) {
      const t = await dailyResp.text();
      console.error("daily error", dailyResp.status, t);
      return new Response(JSON.stringify({ error: "Failed to create call room" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const daily = await dailyResp.json();

    await supa.from("video_rooms").insert({
      room_id: chatRoom.id,
      daily_url: daily.url,
      daily_name: daily.name,
      created_by: u.user.id,
      call_type: type,
    });

    return new Response(JSON.stringify({ url: daily.url, name: daily.name, callType: type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-call-room error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
