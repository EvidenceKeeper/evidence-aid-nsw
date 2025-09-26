import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
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

    const { file_id } = await req.json();
    if (!file_id) {
      return new Response(JSON.stringify({ error: "Missing file_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get file and some chunks for analysis
    const [fileResult, chunksResult] = await Promise.all([
      supabase.from("files").select("name, mime_type").eq("id", file_id).single(),
      supabase.from("chunks").select("text").eq("file_id", file_id).limit(3)
    ]);

    if (fileResult.error || !fileResult.data) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const file = fileResult.data;
    const chunks = chunksResult.data || [];
    const sampleText = chunks.map(c => c.text).join("\n\n").substring(0, 2000);

    // Categorize using OpenAI
    const categorizationPrompt = `
Analyze this legal document and provide categorization:

File name: ${file.name}
File type: ${file.mime_type}
Sample content: ${sampleText}

Based on the content, provide:
1. Primary category from: police_report, medical_record, financial_document, court_document, correspondence, incident_report, evidence_photo, witness_statement, legal_notice, other
2. Suggested tags (array of 2-5 relevant keywords)
3. Brief description (1 sentence explaining what this document contains)

Return JSON with: category, tags, description
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: categorizationPrompt }
        ],
        max_completion_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return new Response(JSON.stringify({ error: "Categorization failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    // Update file with categorization
    const { error: updateError } = await supabase
      .from("files")
      .update({
        auto_category: analysis.category,
        tags: analysis.tags,
        meta: {
          ...(file as any).meta,
          ai_description: analysis.description,
          categorized_at: new Date().toISOString()
        }
      })
      .eq("id", file_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        category: analysis.category,
        tags: analysis.tags,
        description: analysis.description
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("categorize-file error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});