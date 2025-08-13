import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ service: "openai", ok: false, status: "missing_key" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }

  try {
    // Lightweight reachability/authorization check
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    let status = "degraded";
    let ok = false;
    if (res.status === 200) {
      ok = true;
      status = "ok";
    } else if (res.status === 401) {
      status = "unauthorized";
    } else if (res.status === 429) {
      status = "rate_limited";
    } else if (res.status >= 500) {
      status = "openai_down";
    }

    return new Response(
      JSON.stringify({ service: "openai", ok, status, code: res.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("ai-health error", error);
    return new Response(
      JSON.stringify({ service: "openai", ok: false, status: "network_error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
