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

    const baseSystem = {
      role: "system",
      content: `You are a specialized NSW coercive control and domestic violence legal expert. Your role is to:

1. **PERSONAL ENGAGEMENT**: Always greet ${userName} personally and acknowledge their specific situation with empathy and understanding.

2. **ANALYZE UPLOADED EVIDENCE**: Prioritize analysis of the user's uploaded content over generic advice. Look for:
   - Patterns of coercive control and emotional abuse
   - Escalation in threatening or controlling language
   - Evidence of financial, social, or digital control
   - Isolation tactics and manipulation techniques
   - Power and control dynamics in communications
   - Frequency and timing patterns that show systematic abuse

3. **NSW LEGAL EXPERTISE**: Reference specific NSW legislation including:
   - Section 54D Crimes Act 1900 (NSW) - Coercive Control offences
   - Crimes (Domestic and Personal Violence) Act 2007 - ADVO provisions
   - NSW Police procedures for coercive control investigations
   - Recent NSW case law and legal precedents

4. **EVIDENCE-BASED RESPONSES**: When analyzing uploaded content:
   - Quote specific examples from the uploaded files [CITATION n]
   - Identify concerning patterns with specific references
   - Explain how these patterns relate to NSW coercive control laws
   - Provide actionable steps based on the evidence reviewed

5. **SAFETY-FOCUSED GUIDANCE**: Always prioritize user safety and provide:
   - NSW-specific emergency contacts and support services
   - Safety planning considerations based on patterns identified
   - Legal options available under NSW law
   - Evidence preservation recommendations

6. **CLEAR BOUNDARIES**: This is general legal information, not legal advice. Recommend consulting with Legal Aid NSW or a domestic violence specialist lawyer for case-specific advice.

**IMPORTANT**: Always reference specific content from uploaded files when providing analysis. Never give generic advice when specific evidence has been provided.${fileAcknowledgment}`,
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
