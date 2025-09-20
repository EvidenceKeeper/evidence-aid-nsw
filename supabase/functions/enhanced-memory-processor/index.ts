import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: text,
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateHierarchicalSummaries(text: string, fileName: string): Promise<{
  file_summary: string;
  section_summaries: any[];
}> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Create hierarchical summaries for this legal evidence file. Generate:
1. A one-line file summary (max 100 chars)
2. Section summaries for logical divisions in the text

Focus on:
- Key dates, events, and people
- Legal significance and evidence value
- Patterns of behavior or communication
- Timeline markers and chronological events

Return JSON format: {"file_summary": "...", "section_summaries": [{"title": "...", "content": "...", "page_range": "1-2"}]}`
        },
        {
          role: "user",
          content: `File: ${fileName}\n\nContent: ${text.slice(0, 8000)}...`
        }
      ],
      max_completion_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    // Fallback if JSON parsing fails
    return {
      file_summary: `Evidence file: ${fileName}`,
      section_summaries: [{ title: "Document Content", content: text.slice(0, 200), page_range: "1" }]
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { file_id, processing_type = "embeddings_and_summaries" } = await req.json();

    if (!file_id) {
      return new Response(JSON.stringify({ error: "file_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🧠 Enhanced memory processing started for file: ${file_id}`);

    // Get file details
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", file_id)
      .single();

    if (fileError || !file) {
      throw new Error(`File not found: ${fileError?.message}`);
    }

    // Get all chunks for this file
    const { data: chunks, error: chunksError } = await supabase
      .from("chunks")
      .select("*")
      .eq("file_id", file_id)
      .order("seq");

    if (chunksError || !chunks?.length) {
      throw new Error(`No chunks found: ${chunksError?.message}`);
    }

    console.log(`📝 Processing ${chunks.length} chunks for embeddings...`);

    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(async (chunk) => {
      try {
        const embedding = await generateEmbedding(chunk.text);
        return { id: chunk.id, embedding };
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
        return null;
      }
    });

    const embeddingResults = await Promise.all(embeddingPromises);
    const validEmbeddings = embeddingResults.filter(Boolean);

    // Update chunks with embeddings
    for (const result of validEmbeddings) {
      if (result) {
        await supabase
          .from("chunks")
          .update({ embedding: result.embedding })
          .eq("id", result.id);
      }
    }

    console.log(`✅ Generated embeddings for ${validEmbeddings.length} chunks`);

    // Generate hierarchical summaries
    const fullText = chunks.map(c => c.text).join("\n");
    const summaries = await generateHierarchicalSummaries(fullText, file.name);
    
    // Generate exhibit code (A, B, C, etc.)
    const { data: userFiles } = await supabase
      .from("files")
      .select("id")
      .eq("user_id", file.user_id)
      .eq("status", "processed")
      .order("created_at");

    const exhibitIndex = userFiles?.findIndex(f => f.id === file_id) || 0;
    const exhibitCode = String.fromCharCode(65 + exhibitIndex); // A, B, C, etc.

    // Update file with summaries
    await supabase
      .from("files")
      .update({
        file_summary: summaries.file_summary,
        section_summaries: summaries.section_summaries,
        exhibit_code: exhibitCode,
      })
      .eq("id", file_id);

    console.log(`📋 Generated summaries and assigned exhibit code: ${exhibitCode}`);

    // Update case memory with new evidence
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", file.user_id)
      .single();

    const currentEvidenceIndex = caseMemory?.evidence_index || [];
    const newEvidenceEntry = {
      file_id,
      exhibit_code: exhibitCode,
      file_name: file.name,
      summary: summaries.file_summary,
      uploaded_date: file.created_at,
      sections_count: summaries.section_summaries.length,
    };

    const updatedEvidenceIndex = [
      ...currentEvidenceIndex.filter((e: any) => e.file_id !== file_id),
      newEvidenceEntry,
    ];

    await supabase
      .from("case_memory")
      .upsert({
        user_id: file.user_id,
        evidence_index: updatedEvidenceIndex,
        last_updated_at: new Date().toISOString(),
      });

    console.log(`🎯 Updated case memory with new evidence index`);

    return new Response(JSON.stringify({
      success: true,
      embeddings_generated: validEmbeddings.length,
      exhibit_code: exhibitCode,
      file_summary: summaries.file_summary,
      sections_count: summaries.section_summaries.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Enhanced memory processing error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Processing failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});