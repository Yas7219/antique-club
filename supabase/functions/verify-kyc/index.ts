import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nationalities/countries blocked from the platform
const BLOCKED_NATIONALITIES = new Set([
  "israel", "israeli", "il", "isr", "ישראל", "state of israel",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { documentPath, documentType } = body || {};
    if (!documentPath || !["cin", "passport"].includes(documentType)) {
      return new Response(JSON.stringify({ error: "documentPath and documentType (cin|passport) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!String(documentPath).startsWith(`${userId}/`)) {
      return new Response(JSON.stringify({ error: "Forbidden path" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for storage signed URL + DB insert
    const admin = createClient(supabaseUrl, serviceKey);

    // Create signed URL for the AI to read the image
    const { data: signed, error: signErr } = await admin.storage
      .from("kyc-documents")
      .createSignedUrl(documentPath, 300);
    if (signErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not access document" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the image and base64-encode for the AI gateway
    const imgResp = await fetch(signed.signedUrl);
    if (!imgResp.ok) throw new Error("Could not fetch document image");
    const buf = new Uint8Array(await imgResp.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const mime = imgResp.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${mime};base64,${b64}`;

    // Ask AI to extract identity fields via tool calling for structured output
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a KYC verification assistant. Inspect the provided ID document image (national ID card or passport). Extract the holder's full name, nationality (country in English, e.g. 'Morocco', 'France', 'Israel'), document number, expiry date (YYYY-MM-DD), and assess whether the document is a real, readable ID. If the image is not a valid ID, set is_valid_id to false.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Extract identity data from this ${documentType === "cin" ? "national ID card (CIN)" : "passport"}.` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_kyc",
            description: "Return extracted identity fields.",
            parameters: {
              type: "object",
              properties: {
                is_valid_id: { type: "boolean" },
                full_name: { type: "string" },
                nationality: { type: "string", description: "Country name in English" },
                document_number: { type: "string" },
                expiry_date: { type: "string", description: "YYYY-MM-DD or empty if unreadable" },
                confidence: { type: "number", description: "0..1" },
                notes: { type: "string" },
              },
              required: ["is_valid_id", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_kyc" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI verification failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: any = {};
    try { extracted = JSON.parse(toolCall?.function?.arguments || "{}"); } catch { extracted = {}; }

    const nationality = String(extracted.nationality || "").trim();
    const natKey = nationality.toLowerCase();
    let status: "approved" | "rejected" | "pending" = "pending";
    let rejection_reason: string | null = null;

    if (!extracted.is_valid_id) {
      status = "rejected";
      rejection_reason = "Document could not be read. Please upload a clearer photo of your ID.";
    } else if (BLOCKED_NATIONALITIES.has(natKey)) {
      status = "rejected";
      rejection_reason = "Service not available in your region.";
    } else if ((extracted.confidence ?? 0) < 0.55) {
      status = "rejected";
      rejection_reason = "Low confidence reading. Upload a clearer photo of your ID.";
    } else if (extracted.expiry_date) {
      const exp = new Date(extracted.expiry_date);
      if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        status = "rejected";
        rejection_reason = "Document is expired.";
      } else {
        status = "approved";
      }
    } else {
      status = "approved";
    }

    // Build a public-bucket-style path stored only as relative path; signed when needed
    const docUrl = documentPath;

    const { data: inserted, error: insErr } = await admin
      .from("kyc_submissions")
      .insert({
        user_id: userId,
        document_type: documentType,
        document_url: docUrl,
        extracted_name: extracted.full_name || null,
        extracted_nationality: nationality || null,
        extracted_doc_number: extracted.document_number || null,
        extracted_expiry: extracted.expiry_date || null,
        ai_confidence: extracted.confidence ?? null,
        status,
        rejection_reason,
      })
      .select()
      .single();

    if (insErr) {
      console.error("Insert error", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ submission: inserted, status, rejection_reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-kyc error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
