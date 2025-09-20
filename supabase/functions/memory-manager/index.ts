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

interface MemoryUpdateRequest {
  user_id: string;
  query_text?: string;
  action_type: "proactive_triggers" | "update_facts" | "update_timeline" | "update_thread_summary";
  data?: any;
}

interface ProactiveContext {
  timeline_context: string;
  person_appearances: string;
  case_strength_change: string;
  evidence_announcement: string;
}

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

async function runProactiveMemoryTriggers(
  supabase: any, 
  userId: string, 
  queryText: string, 
  contextBlocks: string[]
): Promise<ProactiveContext> {
  console.log("🧠 Running proactive memory triggers...");
  
  // Get current case memory
  const { data: caseMemory } = await supabase
    .from("case_memory")
    .select("*")
    .eq("user_id", userId)
    .single();

  let timelineContext = "";
  let personAppearances = "";
  let caseStrengthChange = "";
  let evidenceAnnouncement = "";

  // Date Detection Trigger
  const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g;
  const dateMatches = queryText.match(dateRegex);
  
  if (dateMatches && caseMemory?.timeline_summary?.length > 0) {
    const relevantTimelineEvents = caseMemory.timeline_summary.filter((event: any) => {
      return dateMatches.some(date => {
        const normalizedDate = date.replace(/[\/\-\.]/g, '/');
        return event.date?.includes(normalizedDate.split('/')[0]) || 
               event.date?.includes(normalizedDate.split('/')[1]) ||
               event.title?.toLowerCase().includes(date);
      });
    });
    
    if (relevantTimelineEvents.length > 0) {
      timelineContext = `\n🗓️ **TIMELINE CONTEXT for ${dateMatches.join(', ')}:**\n`;
      relevantTimelineEvents.forEach((event: any, i: number) => {
        timelineContext += `${i + 1}. ${event.date}: ${event.title} - ${event.fact}\n`;
      });
      timelineContext += "\n";
    }
  }
  
  // Person Detection Trigger
  const personRegex = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
  const personMatches = queryText.match(personRegex);
  
  if (personMatches && contextBlocks.length > 0) {
    const personAppearanceMap: Record<string, any[]> = {};
    
    contextBlocks.forEach((block, index) => {
      personMatches.forEach(person => {
        if (block.toLowerCase().includes(person.toLowerCase())) {
          if (!personAppearanceMap[person]) personAppearanceMap[person] = [];
          personAppearanceMap[person].push({
            citation: index + 1,
            context: block.slice(0, 200) + "..."
          });
        }
      });
    });
    
    Object.entries(personAppearanceMap).forEach(([person, appearances]) => {
      if (appearances.length > 0) {
        personAppearances += `\n👤 **${person.toUpperCase()} APPEARANCES:**\n`;
        appearances.slice(-3).forEach((app: any, i: number) => {
          personAppearances += `${i + 1}. Citation ${app.citation}: ${app.context}\n`;
        });
        personAppearances += "\n";
      }
    });
  }

  // Case Strength Change Detection
  const { data: legalStrategy } = await supabase
    .from("legal_strategy")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (legalStrategy && caseMemory) {
    const currentStrength = caseMemory.case_strength_score || 0;
    const legalStrength = legalStrategy.case_strength_overall || 0;
    
    const strengthDiff = Math.abs(legalStrength - currentStrength);
    if (strengthDiff > 3) {
      const direction = legalStrength > currentStrength ? "+" : "-";
      caseStrengthChange = `\n📊 **CASE STRENGTH UPDATE:** ${Math.round(legalStrength)}% (${direction}${Math.round(strengthDiff)})\n`;
      
      if (legalStrategy.next_steps && Array.isArray(legalStrategy.next_steps)) {
        caseStrengthChange += `**Boosters:** ${legalStrategy.next_steps.slice(0, 3).map((step: any, i: number) => `(${i + 1}) ${step.action || step}`).join(', ')}\n\n`;
      }
      
      // Update case memory with new strength
      await supabase
        .from("case_memory")
        .update({
          case_strength_score: legalStrength,
          case_strength_reasons: legalStrategy.strengths || [],
          last_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }
  }

  // Recent Evidence Announcements
  const { data: recentFiles } = await supabase
    .from("files")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .eq("status", "processed")
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentFiles?.[0]) {
    const recentFile = recentFiles[0];
    const timeSinceUpload = Date.now() - new Date(recentFile.created_at).getTime();
    
    // Only announce if uploaded in last 10 minutes
    if (timeSinceUpload < 10 * 60 * 1000) {
      const { data: recentAnalysis } = await supabase
        .from("evidence_comprehensive_analysis")
        .select("key_insights, timeline_significance")
        .eq("file_id", recentFile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (recentAnalysis) {
        evidenceAnnouncement = `\n📈 **NEW EVIDENCE INDEXED:**\nJust processed "${recentFile.name}" and found ${recentAnalysis.key_insights?.length || 0} key insights. ${recentAnalysis.timeline_significance ? `Timeline impact: ${recentAnalysis.timeline_significance}` : ''}\n\n`;
      }
    }
  }

  return {
    timeline_context: timelineContext,
    person_appearances: personAppearances,
    case_strength_change: caseStrengthChange,
    evidence_announcement: evidenceAnnouncement,
  };
}

async function performVectorSearch(
  supabase: any,
  queryText: string,
  userId: string,
  limit: number = 15
): Promise<any[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Perform vector similarity search
    const { data: vectorResults, error } = await supabase.rpc(
      "match_user_chunks",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.6,
        match_count: limit,
        filter_user_id: userId,
      }
    );

    if (error) {
      console.error("Vector search error:", error);
      return [];
    }

    console.log(`✅ Found ${vectorResults?.length || 0} vector matches`);
    return vectorResults || [];
  } catch (error) {
    console.error("Vector search failed:", error);
    return [];
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
    const requestData: MemoryUpdateRequest = await req.json();

    const { user_id, query_text, action_type, data } = requestData;

    if (!user_id || !action_type) {
      return new Response(JSON.stringify({ 
        error: "user_id and action_type are required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🧠 Memory Manager: ${action_type} for user ${user_id}`);

    switch (action_type) {
      case "proactive_triggers":
        if (!query_text) {
          throw new Error("query_text required for proactive_triggers");
        }
        
        const contextBlocks = data?.context_blocks || [];
        const proactiveContext = await runProactiveMemoryTriggers(
          supabase, 
          user_id, 
          query_text, 
          contextBlocks
        );

        return new Response(JSON.stringify({
          success: true,
          proactive_context: proactiveContext,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "update_thread_summary":
        if (!query_text) {
          throw new Error("query_text required for thread summary update");
        }

        // Get current case memory
        const { data: currentMemory } = await supabase
          .from("case_memory")
          .select("thread_summary")
          .eq("user_id", user_id)
          .single();

        const currentSummary = currentMemory?.thread_summary || "";
        const newEntry = `${new Date().toLocaleDateString()}: ${query_text.slice(0, 50)}...`;
        
        // Keep rolling summary under 120 words
        const summaryParts = currentSummary.split('. ').slice(-3);
        const updatedSummary = [...summaryParts, newEntry].join('. ').slice(0, 120);

        await supabase
          .from("case_memory")
          .upsert({
            user_id,
            thread_summary: updatedSummary,
            last_updated_at: new Date().toISOString(),
          });

        return new Response(JSON.stringify({
          success: true,
          updated_summary: updatedSummary,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        return new Response(JSON.stringify({ 
          error: `Unknown action_type: ${action_type}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error) {
    console.error("Memory manager error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Processing failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
