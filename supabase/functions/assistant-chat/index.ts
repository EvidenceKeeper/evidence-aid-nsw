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

    const { prompt, messages, mode = 'user' } = await req.json();
    if (!prompt && !messages) {
      return new Response(
        JSON.stringify({ error: "Provide 'prompt' (string) or 'messages' (array)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's email for personalized greeting
    const userEmail = user.email;
    const userName = userEmail ? userEmail.split('@')[0] : 'there';

    // === STEP 1: CASE MEMORY & READINESS STATUS (Legal-First RAG Pipeline) ===
    console.log("📋 Loading case memory and readiness status...");
    
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    const caseReadinessStatus = caseMemory?.case_readiness_status || 'collecting';
    const primaryGoal = caseMemory?.primary_goal || '';
    
    console.log(`📊 Case readiness: ${caseReadinessStatus}, Goal: ${primaryGoal ? 'Set' : 'Not set'}`);

    // Check for substantial evidence and case memory
    const { data: allFiles, error: filesError } = await supabase
      .from("files")
      .select("id, name, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "processed")
      .order("created_at", { ascending: false });

    const hasSubstantialEvidence = allFiles && allFiles.length > 0;
    console.log("Building evidence inventory for", allFiles?.length || 0, "files...");

    // === STEP 2: LEGAL-FIRST RETRIEVAL (Primary Knowledge Base) ===
    let legalContext = [];
    let allCitations = [];
    
    if (prompt || (messages && messages.length > 0)) {
      const queryText = prompt || messages[messages.length - 1]?.content || '';
      console.log("🏛️ LEGAL-FIRST: Searching NSW legal database...");
      
      // Create query that combines user input + case goal for better legal retrieval
      const enhancedQuery = primaryGoal 
        ? `${queryText} ${primaryGoal} NSW law legal requirements`
        : `${queryText} NSW law`;
      
      try {
        // Generate embedding for legal search
        console.log("🔍 Generating embedding for legal search...");
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-large",
            input: enhancedQuery,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;
          
          // Search legal chunks FIRST (primary knowledge base)
          const { data: legalChunks, error: legalChunksErr } = await supabase.rpc(
            "match_legal_chunks",
            {
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: 10,
              jurisdiction_filter: 'NSW'
            }
          );

          if (!legalChunksErr && legalChunks && legalChunks.length > 0) {
            console.log(`⚖️ Found ${legalChunks.length} relevant legal sections`);
            
            // Diversify by document/section to avoid redundancy
            const uniqueSections = new Map();
            legalChunks.forEach((chunk, i) => {
              const key = `${chunk.document_id}-${chunk.section_id}`;
              if (!uniqueSections.has(key) && uniqueSections.size < 8) {
                uniqueSections.set(key, chunk);
                allCitations.push({
                  id: `legal-${i}`,
                  type: 'legislation',
                  short_citation: chunk.citation_references?.[0] || `Legal Section ${i + 1}`,
                  full_citation: chunk.citation_references?.[0] || `NSW Legal Database`,
                  url: null,
                  content: chunk.chunk_text,
                  similarity: chunk.similarity,
                  metadata: chunk.metadata
                });
              }
            });
            
            legalContext = Array.from(uniqueSections.values());
            console.log(`📚 Using ${legalContext.length} unique legal sections for context`);
          } else {
            console.log("❌ No legal chunks found or error:", legalChunksErr);
          }

          // === STEP 3: USER EVIDENCE SEARCH (Secondary) ===
          console.log("📋 Fetching relevant user evidence chunks...");
          
          const { data: userChunks, error: userChunksErr } = await supabase.rpc(
            "match_user_chunks",
            {
              query_embedding: queryEmbedding,
              match_threshold: 0.5,
              match_count: 8,
              filter_user_id: user.id,
            }
          );

          if (!userChunksErr && userChunks && userChunks.length > 0) {
            console.log(`📁 Found ${userChunks.length} relevant evidence chunks`);
            
            const evidenceCitations = userChunks.map((chunk, i) => ({
              id: `evidence-${i}`,
              type: 'evidence',
              short_citation: chunk.file_name,
              full_citation: `${chunk.file_name} (Evidence)`,
              url: null,
              content: chunk.text,
              similarity: chunk.similarity,
              metadata: chunk.meta
            }));
            
            allCitations.push(...evidenceCitations);
          }

        } else {
          console.log("📝 Falling back to text search...");
        }
      } catch (error) {
        console.error("Legal search failed:", error);
      }
    }

    // === STEP 4: TIMELINE CONTEXT ===
    const { data: timeline, error: timelineError } = await supabase
      .from("enhanced_timeline_events")
      .select("*")
      .eq("user_id", user.id)
      .order("event_date", { ascending: false })
      .limit(20);

    // === STEP 5: BUILD CONTEXT (Legal-First Order) ===
    console.log("🏗️ Building context in Legal-First order...");
    let contextSections = [];
    
    // 1. LEGAL CONTEXT FIRST (Primary Knowledge Base)
    if (legalContext.length > 0) {
      const legalSections = legalContext.map((chunk, i) => 
        `Legal Authority ${i + 1}: ${chunk.citation_references?.[0] || 'NSW Legal Section'}
Content: ${chunk.chunk_text.substring(0, 800)}...
Similarity: ${chunk.similarity?.toFixed(3) || 'N/A'}`
      ).join('\n\n');
      
      contextSections.push(`NSW LEGAL AUTHORITIES (Primary Reference):
${legalSections}`);
    }
    
    // 2. CASE MEMORY CONTEXT (Case-Specific Information)
    if (caseMemory) {
      contextSections.push(`CASE CONTEXT:
Primary Goal: ${caseMemory.primary_goal || 'Not established yet'}
Case Readiness Status: ${caseReadinessStatus}
Key Facts: ${JSON.stringify(caseMemory.key_facts || []).slice(0, 500)}
Case Strength: ${caseMemory.case_strength_overall || 0}/10
Evidence Index: ${JSON.stringify(caseMemory.evidence_index || []).slice(0, 300)}
Last Updated: ${caseMemory.last_updated_at || 'Never'}`);
    }

    // 3. EVIDENCE CONTEXT (Supporting Evidence)
    const evidenceChunks = allCitations.filter(c => c.type === 'evidence');
    if (evidenceChunks.length > 0) {
      const evidenceContext = evidenceChunks.slice(0, 6).map((cite, i) => 
        `Evidence ${i + 1} (${cite.short_citation}): ${cite.content.substring(0, 400)}...`
      ).join('\n\n');
      contextSections.push(`USER EVIDENCE CONTEXT:\n${evidenceContext}`);
    }

    // 4. TIMELINE CONTEXT (Chronological Evidence)
    if (timeline && timeline.length > 0) {
      const timelineContext = timeline.slice(0, 8).map((event) => 
        `${event.event_date}: ${event.title} - ${event.description.substring(0, 200)}`
      ).join('\n');
      contextSections.push(`TIMELINE CONTEXT:\n${timelineContext}`);
    }

    // === STEP 6: ENHANCED SYSTEM PROMPT WITH ANSWER GATING ===
    const enhancedSystemPrompt = `You are Veronica, an expert NSW legal assistant with advanced case intelligence and legal-first retrieval capabilities.

CRITICAL ANSWER GATING LOGIC:
- Current Case Readiness Status: ${caseReadinessStatus}
- Case Status Definitions:
  * "collecting": Still gathering facts and evidence - NO DRAFTING ALLOWED
  * "reviewing": Analyzing case strength - LIMITED ADVICE ONLY  
  * "nearly_ready": Almost complete understanding - STRATEGIC ADVICE ONLY
  * "ready": Complete case understanding - FULL DRAFTING PERMITTED

MANDATORY CITATION REQUIREMENTS:
- ALWAYS cite specific NSW legal authorities when discussing law
- Use format: "Family Law Act 1975 (NSW) s 60CC" or similar
- Reference exact sections, not general legal principles
- Cross-check legal chunks before asserting any legal rule

RESPONSE RULES BASED ON READINESS:
${caseReadinessStatus === 'collecting' ? '- REFUSE all drafting requests (letters, motions, pleadings)\n- Focus on fact-gathering and evidence identification\n- Ask clarifying questions about case details' : ''}
${caseReadinessStatus === 'reviewing' ? '- Provide preliminary legal analysis only\n- Identify evidence gaps and inconsistencies\n- NO formal document drafting' : ''}
${caseReadinessStatus === 'nearly_ready' ? '- Provide strategic advice and recommendations\n- Outline potential legal approaches\n- NO final document drafting until "ready"' : ''}
${caseReadinessStatus === 'ready' ? '- Full legal assistance including document drafting\n- Provide comprehensive legal strategy\n- Draft formal legal documents when requested' : ''}

Context: You're assisting ${userName} with their legal matter.

LEGAL-FIRST KNOWLEDGE INTEGRATION:
- PRIMARY: Use NSW legal authorities from legal chunks (provided above)
- SECONDARY: Reference user evidence to support legal analysis
- MANDATORY: Cite specific Acts and sections for all legal assertions
- VERIFICATION: Cross-check legal chunks before stating any legal rule

EVIDENCE ANALYSIS PRIORITIES:
1. Legal compliance: Does evidence meet NSW legal requirements?
2. Evidentiary strength: How compelling is the evidence legally?
3. Gap identification: What evidence is missing for legal success?
4. Strategic value: How does evidence support the legal case?

RESPONSE METHODOLOGY:
1. ALWAYS start with relevant legal authorities (Acts/sections)
2. Apply legal requirements to user's specific situation  
3. Analyze evidence against legal standards
4. Identify gaps and next steps
5. Provide citations for ALL legal statements

CRITICAL: If case status is not "ready", you MUST refuse document drafting and focus on case development instead.`;

    // Build final context
    const fullContext = contextSections.join('\n\n');

    // Construct messages for OpenAI
    let conversationMessages = [];

    if (messages && Array.isArray(messages)) {
      conversationMessages = messages;
    } else if (prompt) {
      conversationMessages = [
        { role: "user", content: prompt }
      ];
    }

    // Add system message with context
    const systemMessage = {
      role: "system",
      content: enhancedSystemPrompt + (fullContext ? `\n\nCONTEXT:\n${fullContext}` : '')
    };

    const finalMessages = [systemMessage, ...conversationMessages];

    console.log(`🤖 Sending ${finalMessages.length} messages to OpenAI (${mode} mode)`);

    // Model fallback hierarchy
    const models = ["gpt-5-2025-08-07", "gpt-4.1-2025-04-14", "gpt-4o"];
    let response;
    let lastError;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`🎯 Attempting with model: ${model}`);
      
      try {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: finalMessages,
            max_completion_tokens: 3000,
            stream: false,
          }),
        });

        if (response.ok) {
          console.log(`✅ Success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          lastError = `${model}: ${response.status} ${errorText}`;
          console.warn(`❌ Model ${model} failed: ${lastError}`);
          
          if (i === models.length - 1) {
            throw new Error(`All models failed. Last error: ${lastError}`);
          }
        }
      } catch (error) {
        lastError = `${model}: ${error.message}`;
        console.warn(`❌ Model ${model} error: ${lastError}`);
        
        if (i === models.length - 1) {
          throw new Error(`All models failed. Last error: ${lastError}`);
        }
      }
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Store the conversation
    await supabase.from("messages").insert([
      {
        user_id: user.id,
        role: "user",
        content: prompt || conversationMessages[conversationMessages.length - 1]?.content || "",
        citations: [],
      },
      {
        user_id: user.id,
        role: "assistant",
        content: assistantMessage,
        citations: allCitations,
      }
    ]);

    // Return the response
    return new Response(
      JSON.stringify({
        response: assistantMessage,
        citations: allCitations,
        case_readiness_status: caseReadinessStatus,
        legal_authorities_found: legalContext.length,
        evidence_chunks_found: evidenceChunks.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in assistant-chat:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});