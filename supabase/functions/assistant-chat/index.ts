import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    console.error("OPENAI_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Server not configured. Missing OPENAI_API_KEY." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase env not set");
    return new Response(
      JSON.stringify({ error: "Server not configured. Missing Supabase env." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a supabase client with the user's JWT so RLS policies apply
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, messages } = await req.json();
    if (!prompt && !messages) {
      return new Response(
        JSON.stringify({ error: "Provide 'prompt' (string) or 'messages' (array)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simple per-user rate limit: 10 requests per minute
    const windowMs = 60_000;
    const limit = 10;
    const sinceIso = new Date(Date.now() - windowMs).toISOString();
    const ip = req.headers.get("x-forwarded-for") ?? undefined;

    const { count, error: countErr } = await supabase
      .from("assistant_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sinceIso);

    if (countErr) {
      console.error("Rate limit count error", countErr);
    }

    if ((count ?? 0) >= limit) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this request (non-blocking failure)
    const insertPromise = supabase.from("assistant_requests").insert({
      user_id: user.id,
      ip_address: ip,
    });
    insertPromise.then(({ error }) => error && console.error("Log insert error", error));

    // Build messages and perform lightweight retrieval from user's indexed chunks
    const lastUserText = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m.role === "user")?.content
      : null;
    const queryText = String(prompt ?? lastUserText ?? "").slice(0, 500);

    // Retrieve relevant chunks using full-text search (if any exist)
    let citations: Array<{ index: number; file_id: string; file_name: string; seq: number; excerpt: string; meta: any }> = [];
    let contextBlocks: string[] = [];

    if (queryText) {
      const { data: chunkRows, error: chunkErr } = await supabase
        .from("chunks")
        .select("id, file_id, seq, text, meta")
        .textSearch("tsv", queryText, { type: "websearch" })
        .limit(12);

      if (!chunkErr && chunkRows && chunkRows.length) {
        const fileIds = Array.from(new Set(chunkRows.map((c: any) => c.file_id)));
        const { data: fileRows } = await supabase
          .from("files")
          .select("id, name")
          .in("id", fileIds);
        const nameById: Record<string, string> = {};
        fileRows?.forEach((f: any) => (nameById[f.id] = f.name));

        // Round-robin across files to improve diversity, cap at 6
        const byFile: Record<string, any[]> = {};
        for (const c of chunkRows) {
          (byFile[c.file_id] ||= []).push(c);
        }
        const selected: any[] = [];
        let layer = 0;
        while (selected.length < 6) {
          let advanced = false;
          for (const fid of Object.keys(byFile)) {
            const arr = byFile[fid];
            if (arr[layer]) {
              selected.push(arr[layer]);
              advanced = true;
              if (selected.length >= 6) break;
            }
          }
          if (!advanced) break;
          layer++;
        }
        const finalSel = selected.length ? selected : chunkRows.slice(0, 6);

        citations = finalSel.map((c: any, i: number) => ({
          index: i + 1,
          file_id: c.file_id,
          file_name: nameById[c.file_id] ?? "File",
          seq: c.seq,
          excerpt: String(c.text ?? '').slice(0, 400),
          meta: c.meta ?? {},
        }));
        contextBlocks = citations.map((c) => `[CITATION ${c.index}] ${c.file_name}#${c.seq}: ${c.excerpt}`);
      }
    }

    const baseSystem = {
      role: "system",
      content:
        "You are a careful Australian legal assistant for New South Wales (NSW). You provide general information (not legal advice) and include a disclaimer. When context excerpts are provided, ground your answer in them and reference them with [CITATION n]. Do not fabricate citations. Keep answers concise and practical.",
    };

    const chatMessages = messages ?? [
      baseSystem,
      ...(contextBlocks.length ? [{ role: "system", content: `Context excerpts:\n${contextBlocks.join("\n\n")}` }] : []),
      { role: "user", content: String(queryText || prompt) },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatMessages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error", errText);
      return new Response(
        JSON.stringify({ error: "OpenAI request failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ generatedText, citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in assistant-chat:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
