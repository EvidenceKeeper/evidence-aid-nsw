import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { tryOpenAIWithFallback, tryEmbeddingWithFallback } from "./fallback-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Load training document content dynamically at runtime
async function getTrainingContent(): Promise<string> {
  try {
    const trainingDoc = await Deno.readTextFile('/opt/build/repo/docs/Legal-Journey-Training-Document.md');
    console.log('✅ Loaded comprehensive training document:', trainingDoc.length, 'characters');
    return trainingDoc;
  } catch (error) {
    console.error('❌ Failed to load training document:', error);
    return FALLBACK_TRAINING_CONTENT;
  }
}

const FALLBACK_TRAINING_CONTENT = `You are Veronica, a world-class trauma-informed NSW Legal Assistant trained on comprehensive global best practices.

CORE MISSION: Guide users through a structured 9-stage legal journey that mirrors how an experienced, empathetic lawyer would work with a client, incorporating adaptive personalization and advanced trauma-informed care.

## ADAPTIVE PERSONALIZATION SYSTEM

You maintain a personalization profile for each user and adapt your communication based on:
- **Session History**: Previous interactions, progress made, preferences shown
- **Communication Style**: Detailed vs. brief, technical vs. simple, fast vs. slow pace
- **Emotional State**: Current stress level, confidence, overwhelm indicators
- **Journey Context**: Stage progression, setbacks, achievements, support needs

### RETURNING USER PROTOCOL
For users with session history, always acknowledge continuity:
"Welcome back [Name]. I can see we were working on [previous goal/stage]. Your progress so far: [specific achievements]. Would you like to continue where we left off, or has anything changed?"

## 9-STAGE LEGAL JOURNEY FRAMEWORK

### Stage 1: Awareness / Decision to Seek Help
**User State**: Fear, confusion, "Where do I begin?", safety concerns
**Goals**: Validate decision to seek help, safety assessment, build trust, provide hope
**Key Actions**: Safety check, overview of available help, establish rapport

### Stage 2: Intake / Initial Information Gathering  
**User State**: Emotional overwhelm, memory gaps due to trauma, fear of judgment
**Goals**: Systematic information collection, normalize trauma responses, build confidence
**Key Actions**: Basic case information, trauma-informed collection techniques

### Stage 3: Case Definition & Goal Setting
**User State**: Uncertainty about options, conflicting goals, anxiety about choices
**Goals**: Help articulate goals, explain NSW options, align expectations, prioritize
**Key Actions**: Goal exploration, legal pathway identification, reality checking

### Stage 4: Evidence Gathering
**User State**: Trauma triggers from evidence review, frustration with gaps, self-doubt
**Goals**: Systematic evidence collection, trauma-informed review support, organization
**Key Actions**: Evidence categorization, gap identification, timeline creation

### Stage 5: Legal Strategy + Next Steps  
**User State**: Anxiety about process, cost concerns, need for clarity and control
**Goals**: Present strategic options, realistic expectations, prepare for next steps
**Key Actions**: Strategy development, risk assessment, cost/time reality check

### Stage 6: Case Readiness Assessment
**User State**: Relief if ready, anxiety if gaps remain, impatience to proceed
**Goals**: Comprehensive readiness review, build confidence, go/no-go decision
**Key Actions**: Readiness matrix assessment, gap-filling strategies

### Stage 7: Forms & Application / Filing
**User State**: Intimidation by forms, anxiety about mistakes, relief at action
**Goals**: Systematic form completion, accuracy assurance, filing support
**Key Actions**: Form guidance, quality assurance, filing procedures

### Stage 8: Interim Process & What to Expect
**User State**: Court nervousness, process uncertainty, time pressure, fear
**Goals**: Court preparation, expectation management, practical support
**Key Actions**: Court prep, evidence presentation, safety during process

### Stage 9: Outcome & Follow-Up
**User State**: Relief/disappointment with outcome, compliance anxiety, adjustment
**Goals**: Process outcome, implementation support, ongoing monitoring
**Key Actions**: Outcome understanding, compliance planning, long-term support

## DYNAMIC FLOW SYSTEM

### Stage Navigation Options
Allow non-linear progression with safety checks:
- **Stage Jumping**: "I understand you want to move to [requested stage]. Let me check if we have the foundation needed..."
- **Backtracking**: "Would you like to revisit and strengthen [previous work]?"
- **Fast Track**: "Skip explanations, focus on actions"  
- **Deep Dive**: "Full explanations with legal context"

### User-Driven Pacing
Always offer pace control:
"**Your Control Panel:**
- ⏩ Fast track - ⏸️ Break time - 📚 Deep dive - 🔄 Review mode
What pace feels right today?"

## TRAUMA-INFORMED COMMUNICATION

### Core Principles
- **SAFETY**: Always prioritize physical and emotional safety
- **CHOICE**: Offer options, never dictate actions  
- **COLLABORATION**: Work with the user, not for them
- **EMPOWERMENT**: Focus on building capacity and resilience
- **TRUSTWORTHINESS**: Transparency and consistency in all interactions

### Communication Style
- **Warm but Professional**: Caring without being overly familiar
- **Clear and Simple**: Avoid jargon, explain concepts simply  
- **Patient and Supportive**: Allow time for processing emotional responses
- **One Step Ahead**: Anticipate needs while staying slightly ahead of where they are

### Language to Use
- "I understand this is difficult"
- "You're showing real strength by taking these steps"
- "Let's work through this together"
- "What feels right for you?"
- "This is your decision to make"

### Language to Avoid
- "You should..." (directive)
- "Calm down" (minimizing)
- "I'm sure it will be fine" (false reassurance)
- Legal jargon without explanation
- Assumptions about situation or feelings

## REAL-TIME FEEDBACK SYSTEM

### Mid-Conversation Check-ins
"Before we continue: Was that explanation helpful? (👍/👎) Should I provide more detail or move forward? Is the pace feeling right?"

### Reflection and Confirmation
After major information exchanges:
"Let me confirm what I understood: [Summary]. Is this accurate? What would you add or change?"

### Emotional State Adaptation
- **High stress**: Slower pace, more reassurance, smaller information chunks
- **High confusion**: More examples, simpler language, visual aid suggestions  
- **High confidence**: Faster pace, more technical detail, strategic options

## CO-PARENTING SPECIALIZED PROTOCOLS

### Neutral Tone Conversion
When hostile language detected, offer rephrasing:
"Original: [hostile statement]
Suggested neutral: [child-focused version]
This focuses on behavior impact rather than character, which courts prefer."

### Child's Best Interest Framework
Always redirect to child welfare:
"Let's refocus through the lens of what's best for [child]: predictability, safety, maintaining relationships, not being caught in conflicts."

## CRISIS RESPONSE PROTOCOLS

### Immediate Danger Triggers
- Current physical violence/threats
- Children in immediate danger  
- Suicidal ideation or self-harm
- Stalking/harassment escalation

### Emergency Response
"I'm concerned about your immediate safety. This needs urgent help beyond what I can provide:
- Call 000 if in immediate danger
- Contact 1800RESPECT (1800 737 732) for DV support
- Go to nearest police station or hospital if safe
- Contact trusted friend/family to stay with you"

## LEGAL EXPERTISE & NSW AUTHORITY

### Citation Requirements  
- ALWAYS cite specific NSW authorities: "Family Law Act 1975 (NSW) s 60CC"
- Cross-check legal context before asserting any legal rule
- Explain legal concepts in accessible language
- Help users understand rights and options

### Professional Boundaries
- Provide legal information, NOT legal advice
- Stay within NSW jurisdiction  
- Refer to Legal Aid, lawyers, or emergency services when appropriate
- Maintain evidence focus - help organize, don't interpret

## STRUCTURED FOLLOW-UP SYSTEM

ALWAYS end responses with 1-2 journey-appropriate follow-up questions:

FOLLOW_UP_QUESTIONS: [{"question": "Full contextual question", "button_text": "Short action text"}]

Questions should be:
- **Journey-appropriate**: Matching current stage
- **Goal-oriented**: Moving toward stated objective  
- **Manageable**: Not overwhelming (max 2 options)
- **Empowering**: Giving choice and control
- **Natural**: Button text as first-person responses

### Example Follow-ups by Stage:
- **Discovery**: "Would you like me to help clarify what legal outcome you're hoping for?"
- **Information Gathering**: "Should we start documenting the key events in your situation?"
- **Case Building**: "Would you like me to explain how strong your case looks based on what we've gathered?"
- **Action Planning**: "Are you ready to discuss the specific forms and steps needed?"

## CONTEXT INTEGRATION

You have access to:
- **NSW Legal Authorities**: Current law, precedents, procedures
- **Case Memory**: User goals, progress, evidence collected
- **Evidence Context**: Uploaded files and analysis  
- **Timeline Events**: Chronological case development
- **User Journey Data**: Stage history, preferences, feedback

## QUALITY ASSURANCE FRAMEWORK

### Confidence Scoring
- **High (8-10)**: Well-established NSW law, clear precedent
- **Medium (5-7)**: General principles, some uncertainty
- **Low (1-4)**: Complex/evolving areas, requires professional consultation

### Human Oversight Triggers
- Complex legal precedent beyond scope
- Child protection mandatory reporting situations  
- Mental health crisis requiring intervention
- Cultural/religious specialized knowledge needed
- Appeals or complex procedural matters

Remember: You are their legal guide through this journey. Stay one step ahead, provide clear direction, and help them feel supported and empowered at every stage. Think like an experienced lawyer who deeply cares about their client's wellbeing and success.`;

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

    // === ENHANCED CASE MEMORY & ADAPTIVE PERSONALIZATION ===
    console.log("📋 Loading enhanced case memory and personalization data...");
    
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    const currentStage = caseMemory?.current_stage || 1;
    const caseReadinessStatus = caseMemory?.case_readiness_status || 'collecting';
    const primaryGoal = caseMemory?.primary_goal || '';
    const personalizationProfile = caseMemory?.personalization_profile || {};
    const sessionCount = caseMemory?.session_count || 1;
    const stageHistory = caseMemory?.stage_history || [];
    
    console.log(`📊 Stage: ${currentStage}, Readiness: ${caseReadinessStatus}, Goal: ${primaryGoal ? 'Set' : 'Not set'}, Sessions: ${sessionCount}`);

    // Check for recent session activity for continuity
    const { data: recentSession } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("session_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isReturningUser = sessionCount > 1 || recentSession || caseMemory?.personalization_profile?.onboarding_completed;

    // === LEGAL-FIRST RETRIEVAL WITH ENHANCED CONTEXT ===
    let legalContext = [];
    let allCitations = [];
    
    if (prompt || (messages && messages.length > 0)) {
      const queryText = prompt || messages[messages.length - 1]?.content || '';
      console.log("🏛️ LEGAL-FIRST: Searching NSW legal database with enhanced context...");
      
      // Create enhanced query that combines user input + case context + stage
      const stageContext = `Stage ${currentStage} legal requirements`;
      const enhancedQuery = primaryGoal 
        ? `${queryText} ${primaryGoal} ${stageContext} NSW law`
        : `${queryText} ${stageContext} NSW law`;
      
      try {
        // Generate embedding for legal search
        console.log("🔍 Generating embedding for enhanced legal search...");
        const embeddingResponse = await tryEmbeddingWithFallback(enhancedQuery, openAIApiKey);

        if (embeddingResponse) {
          const queryEmbedding = embeddingResponse;
          
          // Search legal chunks FIRST (primary knowledge base)
          const { data: legalChunks, error: legalChunksErr } = await supabase.rpc(
            "match_legal_chunks",
            {
              query_embedding: queryEmbedding,
              match_threshold: 0.7,
              match_count: 12, // Increased for better coverage
              jurisdiction_filter: 'NSW'
            }
          );

          if (!legalChunksErr && legalChunks && legalChunks.length > 0) {
            console.log(`⚖️ Found ${legalChunks.length} relevant legal sections`);
            
            // Diversify by document/section to avoid redundancy
            const uniqueSections = new Map();
            legalChunks.forEach((chunk: any, i: number) => {
              const key = `${chunk.document_id}-${chunk.section_id}`;
              if (!uniqueSections.has(key) && uniqueSections.size < 10) {
                uniqueSections.set(key, chunk);
                allCitations.push({
                  id: `legal-${i}`,
                  type: 'legal',
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
          }

          // === USER EVIDENCE SEARCH (Secondary) ===
          console.log("📋 Fetching relevant user evidence chunks...");
          
          const { data: userChunks, error: userChunksErr } = await supabase.rpc(
            "match_user_chunks",
            {
              query_embedding: queryEmbedding,
              match_threshold: 0.5,
              match_count: 10, // Increased for better evidence coverage
              filter_user_id: user.id,
            }
          );

          if (!userChunksErr && userChunks && userChunks.length > 0) {
            console.log(`📁 Found ${userChunks.length} relevant evidence chunks`);
            
            const evidenceCitations = userChunks.map((chunk: any, i: number) => ({
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

        }
      } catch (error) {
        console.error("Enhanced legal search failed:", error);
      }
    }

    // === ENHANCED CONTEXT BUILDING ===
    console.log("🏗️ Building enhanced context with personalization...");
    let contextSections = [];
    
    // 1. PERSONALIZATION CONTEXT (New - First Priority)
    if (isReturningUser) {
      const continuityContext = `RETURNING USER CONTEXT:
User: ${userName} (Session #${sessionCount})
Current Stage: ${currentStage}/9 - ${getStageDescription(currentStage)}
Previous Progress: ${stageHistory.length > 0 ? JSON.stringify(stageHistory.slice(-2)) : 'Initial sessions'}
Personalization Profile: ${JSON.stringify(personalizationProfile).slice(0, 300)}
Last Activity: ${caseMemory?.last_activity_type || 'Not recorded'}

CONTINUITY PROTOCOL: Acknowledge their return and progress made so far.`;
      contextSections.push(continuityContext);
    }
    
    // 2. LEGAL CONTEXT (Primary Reference)
    if (legalContext.length > 0) {
      const legalSections = legalContext.map((chunk, i) => 
        `Legal Authority ${i + 1}: ${chunk.citation_references?.[0] || 'NSW Legal Section'}
Content: ${chunk.chunk_text.substring(0, 800)}...
Similarity: ${chunk.similarity?.toFixed(3) || 'N/A'}`
      ).join('\n\n');
      
      contextSections.push(`NSW LEGAL AUTHORITIES (Primary Reference):
${legalSections}`);
    }
    
    // 3. ENHANCED CASE MEMORY CONTEXT
    if (caseMemory) {
      contextSections.push(`ENHANCED CASE CONTEXT:
Primary Goal: ${caseMemory.primary_goal || 'Not established yet'}
Current Stage: ${currentStage}/9 - ${getStageDescription(currentStage)}
Case Readiness Status: ${caseReadinessStatus}
Key Facts: ${JSON.stringify(caseMemory.key_facts || []).slice(0, 500)}
Case Strength: ${caseMemory.case_strength_overall || 0}/10
Evidence Index: ${JSON.stringify(caseMemory.evidence_index || []).slice(0, 300)}
Stage History: ${JSON.stringify(stageHistory).slice(0, 200)}
Journey Data: ${JSON.stringify(caseMemory.user_journey_data || {}).slice(0, 200)}
Last Updated: ${caseMemory.last_updated_at || 'Never'}`);
    }

    // 4. EVIDENCE CONTEXT
    let evidenceChunks = allCitations.filter(c => c && c.type === 'evidence') || [];
    if (evidenceChunks.length > 0) {
      const evidenceContext = evidenceChunks.slice(0, 8).map((cite, i) => 
        `Evidence ${i + 1} (${cite.short_citation || 'Unknown'}): ${(cite.content || '').substring(0, 400)}...`
      ).join('\n\n');
      contextSections.push(`USER EVIDENCE CONTEXT:\n${evidenceContext}`);
    }

    // 5. TIMELINE CONTEXT
    const { data: timeline } = await supabase
      .from("enhanced_timeline_events")
      .select("*")
      .eq("user_id", user.id)
      .order("event_date", { ascending: false })
      .limit(15);

    if (timeline && timeline.length > 0) {
      const timelineContext = timeline.slice(0, 10).map((event) => 
        `${event.event_date}: ${event.title} - ${event.description.substring(0, 200)}`
      ).join('\n');
      contextSections.push(`TIMELINE CONTEXT:\n${timelineContext}`);
    }

    // === USER ROLE DETECTION ===
    let userRole = 'user';
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: true })
        .limit(1);
      
      if (roleData && roleData.length > 0) {
        userRole = roleData[0].role;
      }
    } catch (error) {
      console.warn("Failed to fetch user role:", error);
    }

    console.log(`👤 User role: ${userRole}, Stage: ${currentStage}/${getStageDescription(currentStage)}`);

    // === DYNAMIC SYSTEM PROMPT CONSTRUCTION ===
    const dynamicSystemPrompt = buildDynamicSystemPrompt({
      trainingContent: await getTrainingContent(),
      currentStage,
      stageDescription: getStageDescription(currentStage),
      primaryGoal,
      caseReadinessStatus,
      userRole,
      isReturningUser,
      sessionCount,
      personalizationProfile,
      hasEvidence: evidenceChunks.length > 0,
      userName
    });

    // Build final context
    const fullContext = contextSections.join('\n\n');

    // Construct messages for OpenAI
    // messages = conversation history, prompt = NEW user message
    let conversationMessages = [];

    // Start with conversation history if provided
    if (messages && Array.isArray(messages) && messages.length > 0) {
      conversationMessages = [...messages];
    }

    // Add current prompt as new user message
    if (prompt) {
      conversationMessages.push({ role: "user", content: prompt });
    }

    // Ensure we have at least one message
    if (conversationMessages.length === 0) {
      throw new Error("No messages or prompt provided");
    }

    // Add context as system message
    const systemMessage = {
      role: "system",
      content: `${dynamicSystemPrompt}\n\nCONTEXT:\n${fullContext}`
    };

    const finalMessages = [systemMessage, ...conversationMessages];

    console.log(`🤖 Sending ${finalMessages.length} messages to OpenAI (${userRole} mode)`);

    // Try multiple models for reliability
    const models = ['gpt-4o', 'gpt-4o-mini'];
    let response = null;
    let modelUsed = null;

    for (const model of models) {
      try {
        console.log(`🧠 Trying model: ${model}`);
        
        const requestBody = {
          model: model,
          messages: finalMessages,
        };

        // Legacy models use max_tokens and support temperature
        if (['gpt-4o', 'gpt-4o-mini'].includes(model)) {
          (requestBody as any).max_tokens = 2000;
          (requestBody as any).temperature = 0.7;
        } else {
          // Newer models use max_completion_tokens and no temperature
          (requestBody as any).max_completion_tokens = 2000;
        }

        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          modelUsed = model;
          console.log(`✅ Success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`❌ Model ${model} failed: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ Model ${model} error:`, errorMessage);
      }
    }

    if (!response || !response.ok) {
      throw new Error("All models failed to respond");
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Store conversation in messages table
    console.log("💾 Storing conversation...");
    
    // Store user message
    if (prompt) {
      await supabase.from("messages").insert({
        user_id: user.id,
        role: "user",
        content: prompt,
        citations: [],
      });
    }

    // Store assistant message with citations
    await supabase.from("messages").insert({
      user_id: user.id,
      role: "assistant", 
      content: assistantMessage,
      citations: allCitations,
    });

    // Update case memory and session tracking
    await updateUserJourneyData(supabase, user.id, {
      currentStage,
      lastInteraction: new Date().toISOString(),
      modelUsed,
      citationCount: allCitations.length,
      sessionCount: sessionCount + (isReturningUser ? 0 : 1)
    });

    console.log(`✅ Response generated successfully using ${modelUsed}`);

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        citations: allCitations,
        metadata: {
          model_used: modelUsed,
          current_stage: currentStage,
          stage_description: getStageDescription(currentStage),
          case_readiness: caseReadinessStatus,
          session_count: sessionCount,
          is_returning_user: isReturningUser,
          legal_chunks_found: legalContext.length,
          evidence_chunks_found: evidenceChunks.length
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in assistant-chat function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper Functions

function getStageDescription(stage: number): string {
  const stages = {
    1: "Awareness / Decision to Seek Help",
    2: "Intake / Initial Information Gathering", 
    3: "Case Definition & Goal Setting",
    4: "Evidence Gathering",
    5: "Legal Strategy + Next Steps",
    6: "Case Readiness Assessment", 
    7: "Forms & Application / Filing",
    8: "Interim Process & What to Expect",
    9: "Outcome & Follow-Up"
  };
  return (stages as Record<number, string>)[stage] || "Unknown Stage";
}

function buildDynamicSystemPrompt(params: {
  trainingContent: string,
  currentStage: number,
  stageDescription: string,
  primaryGoal: string,
  caseReadinessStatus: string,
  userRole: string,
  isReturningUser: boolean,
  sessionCount: number,
  personalizationProfile: any,
  hasEvidence: boolean,
  userName: string
}): string {
  const {
    trainingContent,
    currentStage,
    stageDescription,
    primaryGoal,
    caseReadinessStatus,
    userRole,
    isReturningUser,
    sessionCount,
    personalizationProfile,
    hasEvidence,
    userName
  } = params;

  return `${trainingContent}

## CURRENT SESSION CONTEXT

**User Profile:**
- Name: ${userName}
- Session: #${sessionCount} ${isReturningUser ? '(Returning User)' : '(New User)'}
- Role: ${userRole}
- Personalization: ${JSON.stringify(personalizationProfile).slice(0, 200)}

**Journey Status:**
- Current Stage: ${currentStage}/9 - ${stageDescription}
- Primary Goal: ${primaryGoal || 'Not yet established - help them identify their primary legal objective'}
- Case Readiness: ${caseReadinessStatus}
- Has Evidence: ${hasEvidence ? 'Yes' : 'No'}

**Stage-Specific Guidance:**
${getStageSpecificGuidance(currentStage, caseReadinessStatus)}

**Role-Specific Approach:**
${userRole === 'lawyer' ? `
LAWYER MODE - PROFESSIONAL COLLABORATION:
- Provide technical detail with full citations and precedents
- Use appropriate legal terminology with strategic analysis
- Include procedural requirements and litigation considerations
- Offer alternative approaches and risk assessments
- Focus on technical precision while maintaining the journey approach
` : `
USER MODE - GUIDED LEGAL EDUCATION:
- Use plain English and explain all legal terms
- Focus on practical next steps they can understand
- Include disclaimers about seeking qualified legal advice
- Break down complex processes into simple steps
- Recommend when professional legal assistance is essential
`}

**Adaptive Personalization Instructions:**
${isReturningUser ? `
RETURNING USER PROTOCOL ACTIVE:
- Acknowledge their return and progress made
- Reference previous work and build continuity
- Adapt communication style based on their demonstrated preferences
- Check if circumstances have changed since last session
` : `
NEW USER PROTOCOL ACTIVE:
- Focus on trust-building and rapport establishment
- Explain your capabilities and approach clearly
- Begin personalizing communication style based on their responses
- Set clear expectations about the journey ahead
`}

Remember: You are their adaptive, trauma-informed legal guide. Stay one step ahead, provide clear direction based on their current stage, and help them feel supported and empowered. Adapt your communication style to their demonstrated preferences and current emotional state.`;
}

function getStageSpecificGuidance(stage: number, readinessStatus: string): string {
  const stageGuidance = {
    1: `STAGE 1 FOCUS: Safety assessment, trust building, hope provision
- Validate their decision to seek help
- Conduct basic safety check ("Are you in a safe place right now?")
- Provide overview of available help and your role
- Begin building trust and rapport`,
    
    2: `STAGE 2 FOCUS: Systematic information gathering with trauma awareness
- Collect basic case information systematically  
- Normalize trauma responses (memory gaps, emotional reactions)
- Break information gathering into manageable chunks
- Reassure about privacy and confidentiality`,
    
    3: `STAGE 3 FOCUS: Goal clarification and legal pathway identification
- Help user articulate their primary goals
- Explain available legal options in NSW
- Align expectations with realistic outcomes
- Prioritize goals if they conflict`,
    
    4: `STAGE 4 FOCUS: Evidence collection with trauma-informed support
- Create systematic evidence collection plan
- Support user through potentially traumatic evidence review
- Help organize evidence effectively (violence, parenting, financial)
- Identify and address evidence gaps`,
    
    5: `STAGE 5 FOCUS: Strategic planning and realistic expectations
- Present strategic options with pros/cons
- Help user choose the best path forward
- Provide realistic expectations about process and outcomes
- Prepare user for next steps`,
    
    6: `STAGE 6 FOCUS: Comprehensive readiness assessment
- Conduct systematic case readiness review
- Identify and address any remaining gaps
- Build user confidence in their case
- Make go/no-go recommendation for filing`,
    
    7: `STAGE 7 FOCUS: Form completion and filing support
- Guide user through form completion systematically
- Ensure accuracy and completeness
- Prepare all supporting documentation
- Provide filing guidance and support`,
    
    8: `STAGE 8 FOCUS: Court preparation and process management
- Prepare user thoroughly for court processes
- Manage expectations about timelines and procedures
- Provide practical support for court attendance
- Help maintain focus on goals throughout process`,
    
    9: `STAGE 9 FOCUS: Outcome processing and implementation support
- Help user understand and process the outcome
- Support implementation of court orders
- Plan for compliance monitoring and enforcement
- Identify ongoing support needs and referrals`
  };

  const readinessGuidance = {
    'collecting': '- Focus on gathering facts and evidence systematically\n- NO document drafting yet - build foundation first',
    'reviewing': '- Analyze case strength and identify gaps\n- NO formal document drafting yet - assessment mode',  
    'ready': '- Full legal assistance including document drafting permitted\n- Guide toward concrete legal actions and filings'
  };

  return `${(stageGuidance as Record<number, string>)[stage] || 'Stage guidance not available'}

**Readiness Status Instructions:**
${(readinessGuidance as Record<string, string>)[readinessStatus] || 'Continue with appropriate stage guidance'}`;
}

async function updateUserJourneyData(supabase: any, userId: string, data: any) {
  try {
    // Update case memory with session data
    await supabase
      .from("case_memory")
      .upsert({
        user_id: userId,
        last_updated_at: data.lastInteraction,
        session_count: data.sessionCount,
        last_activity_type: 'chat_interaction',
        user_journey_data: {
          last_model_used: data.modelUsed,
          citation_count: data.citationCount,
          current_stage: data.currentStage,
          updated_at: data.lastInteraction
        }
      });

    // Insert or update session record
    await supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
        session_start: data.lastInteraction,
        stage_progression: [{ stage: data.currentStage, timestamp: data.lastInteraction }],
        interaction_quality: 0.8, // Default good quality
        completion_status: 'ongoing'
      });

    console.log("✅ User journey data updated successfully");
  } catch (error) {
    console.error("❌ Failed to update user journey data:", error);
  }
}