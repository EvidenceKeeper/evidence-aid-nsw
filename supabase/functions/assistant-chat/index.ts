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

    // Check for substantial evidence and case memory
    const { data: allFiles, error: filesError } = await supabase
      .from("files")
      .select("id, name, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "processed")
      .order("created_at", { ascending: false });

    const { data: totalChunks } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("file_id", allFiles?.[0]?.id || "");

    const hasSubstantialEvidence = (totalChunks?.count || 0) > 100; // Substantial evidence threshold
    
    // Check if case memory exists  
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: legalStrategy } = await supabase
      .from("legal_strategy")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // SMART TRIGGER: If substantial evidence exists but no case analysis has been done, trigger it now
    let analysisTriggered = false;
    if (hasSubstantialEvidence && !caseMemory && !legalStrategy && allFiles && allFiles.length > 0) {
      console.log('🧠 Smart trigger: Substantial evidence detected, initiating case analysis...');
      
      try {
        const analysisResponse = await supabase.functions.invoke('continuous-case-analysis', {
          body: { 
            file_id: allFiles[0].id,
            analysis_type: 'comprehensive_review' 
          }
        });

        if (!analysisResponse.error) {
          console.log('✅ Smart analysis completed');
          analysisTriggered = true;
          
          // Refresh case memory and strategy after analysis
          const { data: newCaseMemory } = await supabase
            .from("case_memory")
            .select("*")
            .eq("user_id", user.id)
            .single();
          
          const { data: newLegalStrategy } = await supabase
            .from("legal_strategy")
            .select("*")
            .eq("user_id", user.id)
            .single();
        }
      } catch (error) {
        console.error('Smart analysis trigger failed:', error);
      }
    }

    const hasRecentUploads = allFiles && allFiles.length > 0;
    const newlyProcessedFiles = allFiles?.slice(0, 5) || [];

    // Simple per-user rate limit: 10 requests per minute
    const windowMs = 60_000;
    const limit = 10;
    const sinceIso = new Date(Date.now() - windowMs).toISOString();

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

    // Log this request without IP for privacy (non-blocking failure)
    const insertPromise = supabase.from("assistant_requests").insert({
      user_id: user.id,
    });
    insertPromise.then(({ error }) => error && console.error("Log insert error", error));

    // Build messages and perform lightweight retrieval from user's indexed chunks
    const lastUserText = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m.role === "user")?.content
      : null;
    const queryText = String(prompt ?? lastUserText ?? "").slice(0, 500);

    // Enhanced retrieval: user files + NSW legal resources + evidence inventory
    let citations: Array<{ index: number; file_id: string; file_name: string; seq: number; excerpt: string; meta: any; type?: string }> = [];
    let contextBlocks: string[] = [];
    let nswLegalContext: string[] = [];
    let evidenceInventory: string = "";

    // Build comprehensive evidence inventory for AI context
    if (allFiles && allFiles.length > 0) {
      console.log(`Building evidence inventory for ${allFiles.length} files...`);
      
      // Get detailed file information with analysis
      const { data: detailedFiles } = await supabase
        .from("files")
        .select(`
          id, name, created_at, category, auto_category, meta, tags,
          evidence_analysis (
            analysis_type, content, legal_concepts, confidence_score, relevant_citations
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "processed")
        .order("created_at", { ascending: false });

      if (detailedFiles && detailedFiles.length > 0) {
        const inventoryItems = detailedFiles.map((file: any, index: number) => {
          const analysis = file.evidence_analysis?.[0];
          const uploadDate = new Date(file.created_at).toLocaleDateString();
          const category = file.category || file.auto_category || 'Uncategorized';
          
          let inventoryEntry = `
**EXHIBIT ${String.fromCharCode(65 + index)} - ${file.name}**
- Uploaded: ${uploadDate}
- Category: ${category}
- File ID: ${file.id}`;

          if (analysis) {
            inventoryEntry += `
- Analysis: ${analysis.analysis_type}
- Legal Concepts: ${JSON.stringify(analysis.legal_concepts)}
- Confidence: ${Math.round((analysis.confidence_score || 0) * 100)}%
- Key Findings: ${analysis.content?.substring(0, 200)}...`;
            
            if (analysis.relevant_citations) {
              inventoryEntry += `
- Legal Citations: ${JSON.stringify(analysis.relevant_citations)}`;
            }
          }

          if (file.tags && file.tags.length > 0) {
            inventoryEntry += `
- Tags: ${file.tags.join(', ')}`;
          }

          return inventoryEntry;
        }).join('\n\n');

        evidenceInventory = `
=== EVIDENCE INVENTORY (${detailedFiles.length} files) ===
${inventoryItems}

=== EVIDENCE ANALYSIS INSTRUCTIONS ===
When referencing evidence, use the EXHIBIT designations above (e.g., "Exhibit A shows..." or "In your uploaded police report (Exhibit B)..."). Always quote specific content from these files when providing analysis. Each exhibit has been analyzed for legal significance - reference the analysis findings to provide informed guidance.
`;
      }
    }

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

    // Create SMART personalized greeting and evidence acknowledgment
    let smartGreeting = "";
    if (hasSubstantialEvidence && hasRecentUploads) {
      const fileNames = newlyProcessedFiles.map(f => f.name).join(', ');
      const chunkCount = totalChunks?.count || 0;
      
      if (analysisTriggered) {
        smartGreeting = `\n\n🔍 **EVIDENCE ANALYSIS COMPLETE**
I've just analyzed your ${fileNames} containing ${chunkCount}+ pieces of evidence. Based on my analysis, I can already identify concerning patterns that appear relevant to NSW coercive control laws. Let me share what I found and how this strengthens your case...`;
      } else if (caseMemory || legalStrategy) {
        smartGreeting = `\n\n📋 **CASE UPDATE**
I can see you've uploaded ${fileNames} with ${chunkCount}+ evidence pieces that I've analyzed. Based on your established case goals and this evidence, I'm ready to provide specific insights about the patterns I've identified and next steps.`;
      } else {
        smartGreeting = `\n\n📁 **SUBSTANTIAL EVIDENCE DETECTED**
I can see you've uploaded ${fileNames} containing ${chunkCount}+ pieces of evidence. This appears to be a significant evidence collection. I'm analyzing it now to identify patterns and legal significance...`;
      }
    } else if (hasRecentUploads) {
      const fileNames = newlyProcessedFiles.slice(0, 3).map(f => f.name).join(', ');
      smartGreeting = `\n\nI can see you've uploaded ${fileNames}${newlyProcessedFiles.length > 3 ? ' and other files' : ''} which I've now indexed and analyzed. Thank you for providing this evidence - I'll reference the specific content from your uploads in my analysis.`;
    }

    // Get updated case memory after potential analysis
    const { data: currentCaseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();
      
    const { data: currentLegalStrategy } = await supabase
      .from("legal_strategy")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const baseSystem = {
      role: "system",
      content: `I'm Veronica, your NSW Legal Assistant. I'm here to provide warm, supportive legal guidance while helping you achieve ONE clear legal goal at a time.

**MY APPROACH:**
I understand that legal matters can feel overwhelming and emotionally challenging. I'm here to guide you step-by-step with care and focus, making sure we work together toward your specific objective.

**GOAL-FIRST PROTOCOL:**
${!currentCaseMemory ? `I'd like to understand what's bringing you here today. Let's start with identifying your main legal objective:

"I can see this might be a difficult situation for you. To help you most effectively, what's your primary legal goal today? Please choose ONE that feels most urgent:
- Get an AVO (restraining order) 
- Report coercive control to police
- Gather evidence for court
- Understand your legal options
- Prepare for a court hearing

I'm here to support you through this process - you're taking the right steps by seeking help."` : `
**OUR ESTABLISHED GOAL**: ${currentCaseMemory.facts || 'Working together on your legal objective'}
I remember where we left off. Let's continue working on this together with focused support.`}

**MY RESPONSE STYLE:**
- I provide warm, empathetic support while staying focused on your goal
- I acknowledge the emotional difficulty of your situation
- I keep initial responses concise (under 150 words) but warm
- I reference your evidence clearly (e.g., "From your Exhibit A...")
- I give you ONE clear next step so you don't feel overwhelmed
- I check if you're ready before moving forward
- I encourage you throughout the process

**EVIDENCE REVIEW:**
- I'll refer to your files as "Exhibit A", "Exhibit B" etc.
- I'll quote specific relevant text with [CITATION n] format
- I only focus on evidence that helps achieve your current goal

**MY RESPONSE PATTERN:**
"I can see from [specific exhibit] that [quote/finding]. I understand this must be [acknowledgment of emotion]. This evidence actually supports your goal to [user's goal] because [clear explanation].

You're doing well by taking these steps. 

Next step: [ONE specific action]

How does this feel? Ready for the next step?"

**SAFETY FIRST**: If you're in immediate danger, please call 000. Your safety is my top priority.

I'm here to support you, ${userName}.${smartGreeting}`,
    };

    const chatMessages = messages ?? [
      baseSystem,
      ...(evidenceInventory ? [{ role: "system", content: evidenceInventory }] : []),
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
