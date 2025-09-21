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

interface ProcessingJob {
  file_id: string;
  user_id: string;
  processing_type: 'timeline_extraction' | 'pattern_analysis' | 'full_analysis';
  priority: number;
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

    const { file_id, processing_type = 'full_analysis' } = await req.json();
    if (!file_id) {
      return new Response(JSON.stringify({ error: "Missing file_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting enhanced processing for file: ${file_id}, type: ${processing_type}`);

    // Queue the processing job
    const { error: queueError } = await supabase
      .from('evidence_processing_queue')
      .insert({
        file_id,
        user_id: user.id,
        processing_type,
        priority: 1,
        status: 'pending'
      });

    if (queueError) {
      console.error('Error queuing job:', queueError);
    }

    // Start background processing without waiting for completion
    EdgeRuntime.waitUntil(processEvidenceInBackground(supabase, file_id, user.id, processing_type));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Enhanced processing started for ${processing_type}`,
        file_id,
        estimated_completion: '2-5 minutes'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Enhanced evidence processor error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processEvidenceInBackground(supabase: any, fileId: string, userId: string, processingType: string) {
  try {
    console.log(`Background processing started for file: ${fileId}`);
    
    // Update status to processing
    await supabase
      .from('evidence_processing_queue')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('file_id', fileId)
      .eq('user_id', userId);

    // Get file and chunks
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select(`
        id, name, mime_type, size,
        chunks(id, seq, text)
      `)
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fileError || !file) {
      throw new Error(`File not found: ${fileError?.message}`);
    }

    console.log(`Processing file: ${file.name} with ${file.chunks?.length || 0} chunks`);

    // Process based on type
    let results = {};
    
    if (processingType === 'timeline_extraction' || processingType === 'full_analysis') {
      results = { ...results, ...(await extractTimelineEvents(supabase, file, userId)) };
    }
    
    if (processingType === 'pattern_analysis' || processingType === 'full_analysis') {
      results = { ...results, ...(await analyzePatterns(supabase, file, userId)) };
    }

    // Update status to completed
    await supabase
      .from('evidence_processing_queue')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      })
      .eq('file_id', fileId)
      .eq('user_id', userId);

    console.log(`Background processing completed for file: ${fileId}`, results);
    
  } catch (error) {
    console.error(`Background processing failed for file: ${fileId}:`, error);
    
    // Update status to failed
    await supabase
      .from('evidence_processing_queue')
      .update({ 
        status: 'failed', 
        error_message: error.message,
        completed_at: new Date().toISOString() 
      })
      .eq('file_id', fileId)
      .eq('user_id', userId);
  }
}

async function extractTimelineEvents(supabase: any, file: any, userId: string) {
  console.log(`Extracting timeline events from: ${file.name}`);
  
  if (!file.chunks || file.chunks.length === 0) {
    console.log('No chunks found for timeline extraction');
    return { timeline_events: 0 };
  }

  // Get user's goal context for goal-aware extraction
  const { data: caseMemory } = await supabase
    .from('case_memory')
    .select('primary_goal, case_type, legal_objectives')
    .eq('user_id', userId)
    .single();

  const goalContext = caseMemory ? `
USER'S LEGAL GOAL: ${caseMemory.primary_goal || 'Not specified'}
CASE TYPE: ${caseMemory.case_type || 'General'}
OBJECTIVES: ${caseMemory.legal_objectives || 'Not specified'}

GOAL-AWARE EXTRACTION INSTRUCTIONS:
- For CUSTODY cases: prioritize parenting moments, school events, medical appointments, child interactions, communication about children
- For AVO/DOMESTIC VIOLENCE cases: prioritize incidents, threats, controlling behaviors, safety concerns, escalation patterns
- For DIVORCE cases: prioritize financial events, property matters, relationship deterioration, asset discussions
- For COERCIVE CONTROL cases: prioritize monitoring behaviors, isolation tactics, financial control, emotional manipulation
- Filter out events that are not relevant to the user's specific legal goal
` : '';

  // Process chunks in batches for large files
  const BATCH_SIZE = 20;
  const chunks = file.chunks.sort((a: any, b: any) => a.seq - b.seq);
  let totalEvents = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchText = batch.map((c: any) => c.text).join('\n\n');
    
    console.log(`Processing timeline batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
    
    try {
      const events = await extractEventsFromText(batchText, file.name);
      
      // Insert events into database
      if (events.length > 0) {
        const eventsToInsert = events.map((event: any) => {
          const relevantChunk = batch.find((chunk: any) => 
            chunk.text.toLowerCase().includes(event.title.toLowerCase()) ||
            chunk.text.toLowerCase().includes(event.description.toLowerCase())
          ) || batch[0];

          return {
            user_id: userId,
            file_id: file.id,
            chunk_id: relevantChunk.id,
            event_date: event.date,
            event_time: event.time || null,
            title: event.title,
            description: event.description,
            context: relevantChunk.text.substring(0, 500),
            confidence: event.confidence,
            category: event.category,
            verified: false
          };
        });

        const { error: insertError } = await supabase
          .from('timeline_events')
          .insert(eventsToInsert);

        if (insertError) {
          console.error('Error inserting timeline events:', insertError);
        } else {
          totalEvents += events.length;
          console.log(`Inserted ${events.length} timeline events from batch`);
        }
      }
      
      // Small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Error processing timeline batch:`, error);
      // Continue with next batch
    }
  }

  console.log(`Timeline extraction complete: ${totalEvents} events extracted`);
  return { timeline_events: totalEvents };
}

async function extractEventsFromText(text: string, fileName: string): Promise<any[]> {
  const isEmailContent = fileName.toLowerCase().includes('email') || 
                        text.includes('@') || 
                        text.includes('From:') || 
                        text.includes('Subject:');

  const extractionPrompt = isEmailContent ? `
${goalContext}

You are a legal expert specializing in domestic violence and coercive control cases. Analyze this email content to extract significant events and behaviors that may indicate coercive control, manipulation, or abuse.

GOAL-AWARE EXTRACTION: Only extract events that are directly relevant to the user's legal objectives above. Filter out irrelevant events.

For each event, provide:
1. Date (YYYY-MM-DD format, estimate if unclear from context)
2. Time (HH:MM format if mentioned)
3. Brief title (2-6 words focusing on the controlling behavior)
4. Description (1-2 sentences highlighting coercive control elements)
5. Category: coercive_control, threat, monitoring, isolation, financial_control, emotional_abuse, communication, incident, custody_related, child_welfare, other
6. Confidence (0.1-1.0 based on clarity and significance)

Focus on behaviors most relevant to the user's goal:
- Controlling language and demands
- Monitoring and surveillance behaviors
- Isolation tactics and restrictions
- Financial control or economic abuse
- Threats (explicit or implied)
- Emotional manipulation and gaslighting
- Escalation patterns in communication
- Violations of boundaries or court orders
- Child-related control or manipulation (if custody case)

Only extract events with clear behavioral significance for the user's specific legal case.

Email content:
${text}
` : `
${goalContext}

You are a legal document analysis expert. Extract all significant dates, events, and timeline information from this document.

GOAL-AWARE EXTRACTION: Prioritize events that are directly relevant to the user's legal objectives above. Filter out irrelevant events.

For each event, provide:
1. Date (YYYY-MM-DD format, or estimate if unclear)
2. Time (HH:MM format if mentioned)
3. Brief title (2-6 words)
4. Description (1-2 sentences)
5. Category (incident, communication, legal_action, medical, financial, custody_related, child_welfare, property, other)
6. Confidence (0.1-1.0 based on how certain the date/event is)

Focus on events most relevant to the user's case type:
- Specific incidents or events
- Communications (calls, emails, meetings)
- Legal actions (court dates, filings, notices)
- Medical appointments or treatments
- Financial transactions
- Child-related events (for custody cases)
- Property matters (for divorce cases)
- Any dated interactions between parties

Document text:
${text}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "user", content: extractionPrompt }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return [];
    }

    const result = await response.json();
    const extractedData = JSON.parse(result.choices[0].message.content);
    return extractedData.events || [];
    
  } catch (error) {
    console.error("Error extracting events:", error);
    return [];
  }
}

async function analyzePatterns(supabase: any, file: any, userId: string) {
  console.log(`Analyzing patterns in: ${file.name}`);
  
  if (!file.chunks || file.chunks.length === 0) {
    return { patterns: 0 };
  }

  // Combine all text for pattern analysis
  const fullText = file.chunks
    .sort((a: any, b: any) => a.seq - b.seq)
    .map((c: any) => c.text)
    .join('\n\n');

  const patternPrompt = `
Analyze this evidence for patterns of coercive control and domestic violence. Focus on identifying systematic behaviors and escalation patterns.

Identify patterns in these categories:
1. ISOLATION: Attempts to isolate from family, friends, work, or support systems
2. MONITORING: Surveillance, tracking, checking communications or activities  
3. CONTROL: Financial control, restricting freedom, making unilateral decisions
4. INTIMIDATION: Threats, destruction of property, aggressive behavior
5. MANIPULATION: Gaslighting, emotional manipulation, blame-shifting
6. ESCALATION: Increasing frequency, severity, or new types of abuse

For each pattern found, provide:
- pattern_type: (isolation, monitoring, control, intimidation, manipulation, escalation)
- description: Detailed description of the pattern
- evidence_examples: Specific quotes or examples from the text
- timeline_start: Estimated start date (YYYY-MM-DD)
- timeline_end: Estimated end date (YYYY-MM-DD) 
- pattern_strength: Confidence score (0.1-1.0)
- legal_significance: How this pattern relates to coercive control law

Evidence text:
${fullText.substring(0, 8000)} ${fullText.length > 8000 ? '...[content truncated]' : ''}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "user", content: patternPrompt }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return { patterns: 0 };
    }

    const result = await response.json();
    const patternData = JSON.parse(result.choices[0].message.content);
    const patterns = patternData.patterns || [];

    // Insert patterns into database
    if (patterns.length > 0) {
      const patternsToInsert = patterns.map((pattern: any) => ({
        user_id: userId,
        pattern_type: pattern.pattern_type,
        description: pattern.description,
        evidence_files: [file.id],
        pattern_strength: pattern.pattern_strength || 0.5,
        timeline_start: pattern.timeline_start || null,
        timeline_end: pattern.timeline_end || null,
        legal_significance: pattern.legal_significance
      }));

      const { error: insertError } = await supabase
        .from('case_patterns')
        .insert(patternsToInsert);

      if (insertError) {
        console.error('Error inserting patterns:', insertError);
      } else {
        console.log(`Inserted ${patterns.length} patterns`);
      }
    }

    return { patterns: patterns.length };
    
  } catch (error) {
    console.error("Error analyzing patterns:", error);
    return { patterns: 0 };
  }
}