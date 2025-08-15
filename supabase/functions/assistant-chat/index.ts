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
    console.log("Auth header received:", authHeader?.substring(0, 20) + "...");
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if it's the anon key (shouldn't be)
    if (authHeader.includes(SUPABASE_ANON_KEY)) {
      console.error("Anon key detected instead of JWT token");
      return new Response(JSON.stringify({ error: "Invalid token: anon key detected" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a supabase client with the user's JWT so RLS policies apply
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log("User data retrieval:", userData?.user?.id ? "success" : "failed", userError?.message);
    
    const user = userData?.user;
    if (!user) {
      console.error("No user found with provided token:", userError?.message);
      return new Response(JSON.stringify({ error: "Invalid user token", details: userError?.message }), {
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

    // Get user's email for personalized greeting
    const userEmail = user.email;
    const userName = userEmail ? userEmail.split('@')[0] : 'there';

    // Check for recently uploaded files
    const { data: recentFiles, error: filesError } = await supabase
      .from("files")
      .select("name, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const hasRecentUploads = recentFiles && recentFiles.length > 0;
    const newlyProcessedFiles = recentFiles?.filter(f => f.status === 'processed') || [];

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

    // Enhanced retrieval: user files + NSW legal resources
    let citations: Array<{ index: number; file_id: string; file_name: string; seq: number; excerpt: string; meta: any; type?: string }> = [];
    let contextBlocks: string[] = [];
    let nswLegalContext: string[] = [];

    if (queryText) {
      // Expanded search terms for coercive control patterns
      const coerciveControlTerms = [
        queryText,
        queryText + " coercive control domestic violence",
        queryText + " emotional abuse financial control",
        queryText + " intimidation stalking threats",
        "pattern behaviour isolation monitoring"
      ];

      // Search user's uploaded chunks (increased limit for comprehensive analysis)
      const { data: chunkRows, error: chunkErr } = await supabase
        .from("chunks")
        .select("id, file_id, seq, text, meta")
        .textSearch("tsv", coerciveControlTerms.join(" | "), { type: "websearch" })
        .limit(20);

      // Search NSW legal resources for relevant law and procedures
      const { data: legalRows, error: legalErr } = await supabase
        .from("nsw_legal_resources")
        .select("id, title, content, category, reference, url")
        .textSearch("tsv", queryText + " coercive control domestic violence", { type: "websearch" })
        .limit(8);

      if (!chunkErr && chunkRows && chunkRows.length) {
        const fileIds = Array.from(new Set(chunkRows.map((c: any) => c.file_id)));
        const { data: fileRows } = await supabase
          .from("files")
          .select("id, name")
          .in("id", fileIds);
        const nameById: Record<string, string> = {};
        fileRows?.forEach((f: any) => (nameById[f.id] = f.name));

        // Prioritize more chunks for comprehensive analysis (increased from 6 to 15)
        const byFile: Record<string, any[]> = {};
        for (const c of chunkRows) {
          (byFile[c.file_id] ||= []).push(c);
        }
        const selected: any[] = [];
        let layer = 0;
        while (selected.length < 15) {
          let advanced = false;
          for (const fid of Object.keys(byFile)) {
            const arr = byFile[fid];
            if (arr[layer]) {
              selected.push(arr[layer]);
              advanced = true;
              if (selected.length >= 15) break;
            }
          }
          if (!advanced) break;
          layer++;
        }
        const finalSel = selected.length ? selected : chunkRows.slice(0, 15);

        citations = finalSel.map((c: any, i: number) => ({
          index: i + 1,
          file_id: c.file_id,
          file_name: nameById[c.file_id] ?? "File",
          seq: c.seq,
          excerpt: String(c.text ?? '').slice(0, 500),
          meta: c.meta ?? {},
          type: "user_file"
        }));
        contextBlocks = citations.map((c) => `[CITATION ${c.index}] ${c.file_name}#${c.seq}: ${c.excerpt}`);
      }

      // Add NSW legal resources to context
      if (!legalErr && legalRows && legalRows.length) {
        const legalCitations = legalRows.map((legal: any, i: number) => ({
          index: citations.length + i + 1,
          file_id: legal.id,
          file_name: `NSW Legal Resource: ${legal.title}`,
          seq: 1,
          excerpt: `${legal.content} ${legal.reference ? `(Reference: ${legal.reference})` : ''}`,
          meta: { category: legal.category, url: legal.url },
          type: "legal_resource"
        }));
        
        citations = [...citations, ...legalCitations];
        nswLegalContext = legalCitations.map((c) => `[CITATION ${c.index}] ${c.file_name}: ${c.excerpt}`);
        contextBlocks = [...contextBlocks, ...nswLegalContext];
      }
    }

    // Create personalized greeting and file acknowledgment
    let fileAcknowledgment = "";
    if (hasRecentUploads) {
      if (newlyProcessedFiles.length > 0) {
        fileAcknowledgment = `\n\nI can see you've uploaded ${newlyProcessedFiles.map(f => f.name).join(', ')} which I've now indexed and analyzed. Thank you for providing this evidence - I'll reference the specific content from your uploads in my analysis.`;
      } else if (recentFiles && recentFiles.length > 0) {
        fileAcknowledgment = `\n\nI can see you have files uploaded (${recentFiles.map(f => f.name).join(', ')}). I'll analyze the content that's been indexed to provide specific insights about your situation.`;
      }
    }

    // Check for existing case memory to understand user's goals
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const baseSystem = {
      role: "system",
      content: `You are a specialized NSW coercive control and domestic violence legal expert and strategic advisor. Your mission is to help users achieve their specific legal objectives through detailed evidence analysis and proactive guidance.

## CORE METHODOLOGY ##

**STEP 1: GOAL ESTABLISHMENT** ${!caseMemory ? `
- If this is our first interaction, IMMEDIATELY ask about their primary legal objective:
  * Seeking an ADVO (Apprehended Domestic Violence Order)?
  * Building evidence for criminal charges under Section 54D?
  * Preparing for family court proceedings?
  * Safety planning and immediate protection?
  * Documenting ongoing abuse patterns?
- Ask about key parties involved, timeline, and current safety situation
- Store this information for future reference` : `
- User's established goal: ${caseMemory.facts || 'Not yet documented'}
- Key parties: ${JSON.stringify(caseMemory.parties || {})}
- Issues identified: ${JSON.stringify(caseMemory.issues || {})}`}

**STEP 2: EVIDENCE ANALYSIS FRAMEWORK**
When analyzing uploaded content, provide responses in this exact structure:

🔍 **QUICK SUMMARY** (2-3 sentences)
Brief overview of what I found and its legal significance.

📋 **DETAILED EVIDENCE ANALYSIS**
- **Pattern Identification**: Specific coercive control patterns found with direct quotes [CITATION n]
- **Escalation Timeline**: Progression of controlling behaviors over time
- **Legal Significance**: How evidence relates to Section 54D elements (isolation, monitoring, controlling conduct, etc.)
- **Strength Assessment**: Rate evidence strength (Strong/Moderate/Developing) and explain why

📚 **LEGAL EDUCATION**
- **NSW Law Explanation**: Relevant sections of Crimes Act 1900 and how your evidence fits
- **Court Perspective**: How judges typically view this type of evidence
- **Precedent Comparison**: Similar cases and outcomes when relevant

🎯 **STRATEGIC NEXT STEPS**
Priority-ranked actions toward your goal:
1. **Immediate Actions** (this week)
2. **Evidence Strengthening** (ongoing)
3. **Legal Preparation** (medium term)
4. **Safety Considerations** (continuous)

**STEP 3: EVIDENCE CITATION RULES**
- ALWAYS quote specific text from uploaded files using [CITATION n] format
- Compare multiple pieces of evidence to show patterns
- Explain WHY each piece of evidence matters legally
- Teach the user about evidence strength and court admissibility

**STEP 4: EDUCATIONAL TEACHING**
- Explain coercive control laws in plain English
- Connect evidence to specific legal elements
- Teach evidence preservation and documentation techniques
- Explain court procedures and what to expect

**STEP 5: PROACTIVE GUIDANCE**
- Suggest evidence gaps that need filling
- Recommend documentation strategies
- Provide safety planning based on patterns identified
- Connect to NSW support services and legal aid

## NSW LEGAL EXPERTISE ##
- Section 54D Crimes Act 1900 (NSW) - Coercive Control offences
- Crimes (Domestic and Personal Violence) Act 2007 - ADVO provisions  
- NSW Police coercive control investigation procedures
- Family Court considerations for coercive control
- Recent NSW precedents and case law

## SAFETY PRIORITY ##
Always assess safety implications based on evidence patterns and provide NSW-specific emergency contacts.

## PERSONAL ENGAGEMENT ##
Address ${userName} personally and acknowledge their courage in documenting abuse.${fileAcknowledgment}

**CRITICAL**: Never provide hypothetical examples. Always analyze the actual uploaded evidence with specific quotes and citations. Teach the user why each finding matters legally and what to do next.`,
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

    // Save the conversation to messages table for case memory
    const messagePromise = supabase.from("messages").insert([
      {
        user_id: user.id,
        role: "user",
        content: String(queryText || prompt),
        citations: []
      },
      {
        user_id: user.id,
        role: "assistant", 
        content: generatedText,
        citations: citations
      }
    ]);
    messagePromise.then(({ error }) => error && console.error("Message save error", error));

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
