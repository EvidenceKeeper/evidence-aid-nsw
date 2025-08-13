import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

function chunkText(text: string, target = 1200, overlap = 200) {
  const chunks: { seq: number; text: string }[] = [];
  let i = 0;
  let seq = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + target);
    const piece = text.slice(i, end);
    const trimmed = piece.trim();
    if (trimmed) chunks.push({ seq, text: trimmed });
    seq++;
    if (end >= text.length) break;
    i = end - Math.min(overlap, end - i);
  }
  return chunks;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured for Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = await req.json();
    const { name, storage_path, mime_type, size, text, meta } = body ?? {};

    if (!name || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create file record
    const { data: fileInsert, error: fileErr } = await supabase
      .from("files")
      .insert({
        user_id: user.id,
        name,
        storage_path: storage_path ?? null,
        mime_type: mime_type ?? null,
        size: size ?? null,
        status: "processing",
        meta: meta ?? {},
      })
      .select("id")
      .single();

    if (fileErr || !fileInsert) {
      console.error("File insert error", fileErr);
      return new Response(JSON.stringify({ error: "Failed to create file record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileId = fileInsert.id as string;

    // Chunk text and insert
    const chunks = chunkText(String(text));
    if (chunks.length) {
      const rows = chunks.map((c) => ({ file_id: fileId, seq: c.seq, text: c.text, meta: {} }));
      const { error: chunkErr } = await supabase.from("chunks").insert(rows);
      if (chunkErr) {
        console.error("Chunk insert error", chunkErr);
        return new Response(JSON.stringify({ error: "Failed to insert chunks" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Mark file processed
    const { error: updErr } = await supabase
      .from("files")
      .update({ status: "processed" })
      .eq("id", fileId);
    if (updErr) console.error("File status update error", updErr);

    return new Response(
      JSON.stringify({ file_id: fileId, chunks: chunks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ingest-text error", error);
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
