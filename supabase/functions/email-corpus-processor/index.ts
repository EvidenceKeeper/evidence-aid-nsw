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

interface ParsedEmail {
  msg_id: string;
  sent_at: string;
  from_name: string;
  from_email: string;
  to_list: string[];
  subject: string;
  body_excerpt: string;
  has_attachment: boolean;
  tz_guess?: boolean;
}

interface EmailIncident {
  occurred_at: string;
  title: string;
  summary: string;
  actors: string[];
  source_msg_ids: string[];
  tags: string[];
  confidence: number;
}

interface BehaviorPattern {
  label: string;
  description: string;
  examples: Array<{ sent_at: string; subject_or_excerpt: string }>;
  risk: "low" | "med" | "high";
}

interface Contradiction {
  issue: string;
  msg_ids: string[];
}

interface Corroboration {
  fact: string;
  supporting_msg_ids: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
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
    const { file_id, file_name, text } = body;

    console.log(`📧 Processing email corpus: ${file_name}`);

    // Step 1: Parse emails from the text
    const emails = await parseEmailCorpus(text);
    console.log(`Found ${emails.length} emails`);

    if (emails.length === 0) {
      return new Response(JSON.stringify({ 
        error: "No emails detected", 
        suggestion: "This looks like an email export but no messages could be parsed. Try exporting in .eml format with headers." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Extract legal incidents from emails
    const incidents = await extractIncidents(emails, user.id);
    console.log(`Extracted ${incidents.length} legal incidents`);

    // Step 3: Analyze behavior patterns
    const patterns = await analyzeBehaviorPatterns(emails);
    console.log(`Identified ${patterns.length} behavior patterns`);

    // Step 4: Detect contradictions and corroborations
    const { contradictions, corroborations } = await detectContradictionsCorroborations(emails);
    console.log(`Found ${contradictions.length} contradictions, ${corroborations.length} corroborations`);

    // Step 5: Create timeline events
    const timelineEvents = await createTimelineEvents(incidents, file_id, user.id);
    console.log(`Created ${timelineEvents.length} timeline events`);

    // Step 6: Generate lawyer summary
    const lawyerSummary = await generateLawyerSummary(emails, incidents, patterns, contradictions, corroborations);

    // Calculate date range
    const dates = emails.map(e => new Date(e.sent_at)).filter(d => !isNaN(d.getTime())).sort();
    const dateRange = dates.length > 0 ? {
      start: dates[0].toISOString().split('T')[0],
      end: dates[dates.length - 1].toISOString().split('T')[0]
    } : null;

    // Store email processing results
    await supabase.from("evidence_comprehensive_analysis").upsert({
      user_id: user.id,
      file_id: file_id,
      analysis_passes: [{
        type: "email_corpus_analysis",
        emails_count: emails.length,
        incidents_count: incidents.length,
        patterns_count: patterns.length,
        date_range: dateRange
      }],
      synthesis: {
        lawyer_summary: lawyerSummary,
        behavior_patterns: patterns,
        contradictions: contradictions,
        corroborations: corroborations
      },
      confidence_score: incidents.length > 0 ? 0.8 : 0.3,
      legal_strength: Math.min(10, Math.floor(incidents.length * 2 + patterns.length)),
      pattern_connections: patterns.map(p => ({ type: p.label, description: p.description, risk: p.risk })),
      key_insights: [
        `${emails.length} emails analyzed spanning ${dateRange ? `${dateRange.start} to ${dateRange.end}` : 'multiple dates'}`,
        `${incidents.length} legal incidents identified`,
        `${patterns.length} behavior patterns detected`
      ],
      strategic_recommendations: patterns.filter(p => p.risk !== "low").map(p => 
        `Address ${p.label}: ${p.description}`
      ),
      case_impact: `Email corpus provides ${incidents.length} dated incidents for timeline evidence`,
      timeline_significance: `${timelineEvents.length} events added to case timeline`
    });

    // Get user's goal for context-aware messaging
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("primary_goal")
      .eq("user_id", user.id)
      .single();

    // Create goal-aware proactive message
    let goalContext = "";
    if (caseMemory?.primary_goal) {
      goalContext = `Building on your goal of ${caseMemory.primary_goal}, here's what I found in your email evidence:`;
    } else {
      goalContext = `I found ${emails.length} emails spanning ${dateRange ? `${dateRange.start} → ${dateRange.end}` : 'multiple dates'}.`;
    }

    return new Response(JSON.stringify({
      success: true,
      emails_processed: emails.length,
      incidents_extracted: incidents.length,
      timeline_events_created: timelineEvents.length,
      date_range: dateRange,
      patterns: patterns.length,
      proactive_message: {
        summary: goalContext,
        key_findings: [
          `${incidents.length} legally significant incidents identified`,
          `${patterns.length} behavior patterns detected`,
          `${timelineEvents.length} timeline events ready to add`
        ],
        offer: timelineEvents.length > 0 
          ? `I can add ${timelineEvents.length} dated events to your timeline now. Proceed?`
          : `No specific dates found, but I've analyzed the content patterns for your case.`,
        lawyer_summary: lawyerSummary
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Email corpus processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function parseEmailCorpus(text: string): Promise<ParsedEmail[]> {
  const prompt = `Parse this email corpus into individual messages. Look for these patterns:
- RFC5322 headers: From:, To:, Cc:, Subject:, Date:
- Quoted reply markers: "On <date> at <time>, <name> wrote:"
- Apple Mail/export "From - " mbox separators
- AU date formats: DD/MM/YYYY, D/M/YY, DD Mon YYYY, ISO YYYY-MM-DD, plus AM/PM or 24h times

Extract each message as JSON with:
{
  "msg_id": "hash_of_content",
  "sent_at": "ISO_datetime",
  "from_name": "sender_name", 
  "from_email": "sender@email.com",
  "to_list": ["recipient@email.com"],
  "subject": "email_subject",
  "body_excerpt": "first_240_chars_no_PII",
  "has_attachment": boolean,
  "tz_guess": true_if_timezone_unknown
}

Return JSON array of messages in chronological order. If timezone unknown, assume NSW/Australia timezone.

EMAIL CORPUS:
${text.slice(0, 50000)}`; // Limit input size

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 4000,
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    // If JSON parsing fails, return empty array
    console.error("Failed to parse email JSON response");
    return [];
  }
}

async function extractIncidents(emails: ParsedEmail[], userId: string): Promise<EmailIncident[]> {
  if (emails.length === 0) return [];

  const emailSummary = emails.map(e => 
    `${e.sent_at} | ${e.from_name} → ${e.to_list.join(',')} | ${e.subject} | ${e.body_excerpt}`
  ).join('\n');

  const prompt = `From these emails, identify incidents relevant to family law matters (breach of consent orders, harassment, coercive control, parenting logistics, safety concerns).

For each incident, extract:
{
  "occurred_at": "ISO_datetime",
  "title": "brief_title_max_12_words",
  "summary": "neutral_2_sentence_description", 
  "actors": ["person_names"],
  "source_msg_ids": ["msg_id"],
  "tags": ["breach_orders", "harassment", "coercive_control", "parenting", "s60CC"],
  "confidence": 0.0_to_1.0
}

Merge near-duplicates (same day ±1d, same actors, similar issues). Focus on legally significant events.

EMAILS:
${emailSummary.slice(0, 40000)}

Return JSON array of incidents:`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
      temperature: 0.2
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    console.error("Failed to parse incidents JSON");
    return [];
  }
}

async function analyzeBehaviorPatterns(emails: ParsedEmail[]): Promise<BehaviorPattern[]> {
  if (emails.length < 3) return [];

  const emailSummary = emails.map(e => 
    `${e.sent_at} | ${e.subject} | ${e.body_excerpt}`
  ).join('\n');

  const prompt = `Analyze these emails for behavior patterns: frequency, escalation, late-night messaging, repeated topics, surveillance, threats.

Return patterns as JSON:
{
  "label": "pattern_name",
  "description": "2_sentence_description",
  "examples": [{"sent_at": "ISO", "subject_or_excerpt": "text"}],
  "risk": "low|med|high"
}

Focus on patterns relevant to family law: coercive control, harassment, parenting interference.

EMAILS:
${emailSummary.slice(0, 35000)}

Return JSON array:`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    console.error("Failed to parse patterns JSON");
    return [];
  }
}

async function detectContradictionsCorroborations(emails: ParsedEmail[]): Promise<{
  contradictions: Contradiction[];
  corroborations: Corroboration[];
}> {
  if (emails.length < 3) return { contradictions: [], corroborations: [] };

  const emailSummary = emails.map(e => 
    `${e.msg_id} | ${e.sent_at} | ${e.subject} | ${e.body_excerpt}`
  ).join('\n');

  const prompt = `Detect contradictions and corroborations across these emails.

Contradictions: Conflicting statements (e.g., "I will be there" vs "I never agreed")
Corroborations: Independent messages supporting the same facts

Return JSON:
{
  "contradictions": [{"issue": "description", "msg_ids": ["id1", "id2"]}],
  "corroborations": [{"fact": "description", "supporting_msg_ids": ["id1", "id2"]}]
}

EMAILS:
${emailSummary.slice(0, 30000)}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1500,
      temperature: 0.2
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    console.error("Failed to parse contradictions/corroborations JSON");
    return { contradictions: [], corroborations: [] };
  }
}

async function createTimelineEvents(incidents: EmailIncident[], fileId: string, userId: string): Promise<any[]> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  });

  const timelineEvents = incidents.map(incident => ({
    user_id: userId,
    file_id: fileId,
    event_date: incident.occurred_at.split('T')[0],
    event_time: incident.occurred_at.includes('T') ? incident.occurred_at.split('T')[1].split('.')[0] : null,
    title: incident.title,
    description: incident.summary,
    category: incident.tags[0] || 'communication',
    confidence: incident.confidence,
    legal_significance: `Email evidence: ${incident.actors.join(', ')}`,
    evidence_type: 'email_corpus',
    context: `Source: ${incident.source_msg_ids.length} email(s)`,
    verified: false
  }));

  if (timelineEvents.length > 0) {
    const { data, error } = await supabase
      .from('timeline_events')
      .insert(timelineEvents)
      .select();

    if (error) {
      console.error("Timeline events insert error:", error);
      return [];
    }
    return data || [];
  }

  return [];
}

async function generateLawyerSummary(
  emails: ParsedEmail[], 
  incidents: EmailIncident[], 
  patterns: BehaviorPattern[],
  contradictions: Contradiction[],
  corroborations: Corroboration[]
): Promise<string> {
  const dates = emails.map(e => new Date(e.sent_at)).filter(d => !isNaN(d.getTime())).sort();
  const dateRange = dates.length > 0 ? `${dates[0].toDateString()} → ${dates[dates.length-1].toDateString()}` : 'Unknown range';

  const summary = `LAWYER-MODE SUMMARY (≤250 words):

(1) TIMELINE HIGHLIGHTS: ${incidents.slice(0, 3).map(i => 
    `${i.occurred_at.split('T')[0]}: ${i.title}`
  ).join('; ')}${incidents.length > 3 ? ` (+${incidents.length - 3} more)` : ''}

(2) BEHAVIOR PATTERNS: ${patterns.map(p => 
    `${p.label} (${p.risk} risk): ${p.description.split('.')[0]}`
  ).join('; ') || 'None detected'}

(3) LIKELY BREACHES: ${incidents.filter(i => 
    i.tags.includes('breach_orders') || i.tags.includes('harassment')
  ).map(i => i.title).join('; ') || 'Under assessment'}

(4) CONTRADICTIONS: ${contradictions.map(c => 
    `${c.issue} (msgs: ${c.msg_ids.length})`
  ).join('; ') || 'None detected'}

(5) GAPS TO CONFIRM: Original .eml files with full headers; Attachment content; Metadata verification; Time zone confirmation for undated entries.

EVIDENCE STRENGTH: ${emails.length} emails over ${dateRange} providing ${incidents.length} dated incidents for timeline.`;

  return summary.slice(0, 250);
}