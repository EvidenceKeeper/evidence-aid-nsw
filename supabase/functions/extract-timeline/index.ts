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

interface TimelineEvent {
  date: string;
  time?: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
}

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

    // Get all chunks for the file
    const { data: chunks, error: chunksError } = await supabase
      .from("chunks")
      .select("id, text, seq")
      .eq("file_id", file_id)
      .order("seq");

    if (chunksError || !chunks?.length) {
      return new Response(JSON.stringify({ error: "No chunks found for file" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Combine text from all chunks
    const fullText = chunks.map(c => c.text).join("\n\n");

    // Extract timeline events using OpenAI
    const extractionPrompt = `
You are a legal document analysis expert. Extract all significant dates, events, and timeline information from this document.

For each event, provide:
1. Date (YYYY-MM-DD format, or estimate if unclear)
2. Time (HH:MM format if mentioned)
3. Brief title (2-6 words)
4. Description (1-2 sentences)
5. Category (incident, communication, legal_action, medical, financial, other)
6. Confidence (0.1-1.0 based on how certain the date/event is)

Focus on:
- Specific incidents or events
- Communications (calls, emails, meetings)
- Legal actions (court dates, filings, notices)
- Medical appointments or treatments
- Financial transactions
- Any dated interactions between parties

Return a JSON array of events. Only include events with clear temporal information.

Document text:
${fullText}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          { role: "user", content: extractionPrompt }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return new Response(JSON.stringify({ error: "Timeline extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const extractedData = JSON.parse(result.choices[0].message.content);
    const events: TimelineEvent[] = extractedData.events || [];

    console.log(`Extracted ${events.length} timeline events`);

    // Insert timeline events into database
    const insertPromises = events.map(async (event) => {
      // Find the chunk that contains this event context
      const relevantChunk = chunks.find(chunk => 
        chunk.text.toLowerCase().includes(event.title.toLowerCase()) ||
        chunk.text.toLowerCase().includes(event.description.toLowerCase())
      ) || chunks[0];

      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) {
        console.warn(`Invalid date: ${event.date}`);
        return null;
      }

      const { error } = await supabase
        .from("timeline_events")
        .insert({
          user_id: user.id,
          file_id,
          chunk_id: relevantChunk.id,
          event_date: event.date,
          event_time: event.time || null,
          title: event.title,
          description: event.description,
          context: relevantChunk.text.substring(0, 500), // First 500 chars as context
          confidence: event.confidence,
          category: event.category,
          verified: false
        });

      if (error) {
        console.error("Insert error:", error);
        return null;
      }
      return event;
    });

    const insertResults = await Promise.all(insertPromises);
    const successfulInserts = insertResults.filter(Boolean);

    return new Response(
      JSON.stringify({ 
        extracted: events.length,
        inserted: successfulInserts.length,
        events: successfulInserts
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("extract-timeline error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});