import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate confidence score based on legal sources and evidence
function calculateConfidence(
  content: string, 
  legalSections: any[], 
  files: any[]
) {
  let score = 0.5; // Base score
  const sourceReferences: any[] = [];
  let reasoning = '';
  
  // Check if response contains legal citations
  const hasCitations = /\b(s\d+|section\s+\d+|\d{4}\s+[A-Z]+)/i.test(content);
  const hasAct = /(Act|Crimes|Family Law|Domestic Violence)/i.test(content);
  
  // Confidence factors
  if (legalSections && legalSections.length > 0) {
    score += 0.2; // Legal sources found
    legalSections.forEach(section => {
      if (section.citation_reference) {
        sourceReferences.push({
          type: 'statute',
          citation: section.citation_reference,
          section: section.title
        });
      }
    });
  }
  
  if (hasCitations) {
    score += 0.15; // Contains specific citations
  }
  
  if (files && files.length > 0) {
    score += 0.1; // Has user evidence
  }
  
  if (hasAct) {
    score += 0.05; // References specific legislation
  }
  
  // Cap at 1.0
  score = Math.min(score, 1.0);
  
  // Determine verification status and reasoning
  let verification_status: 'ai_generated' | 'requires_review' | 'lawyer_verified' = 'ai_generated';
  let is_legal_advice = false;
  
  // Detect if response gives specific legal advice (not just information)
  const adviceIndicators = [
    /you should/i,
    /you must/i,
    /you need to/i,
    /file for/i,
    /apply for/i,
    /your case/i,
    /your situation/i
  ];
  
  const hasAdviceLanguage = adviceIndicators.some(pattern => pattern.test(content));
  
  if (hasAdviceLanguage && score < 0.7) {
    verification_status = 'requires_review';
    is_legal_advice = true;
    reasoning = 'This response contains guidance specific to your situation. While based on NSW law, it should be verified by a lawyer before taking action.';
  } else if (hasAdviceLanguage) {
    is_legal_advice = true;
    reasoning = `This guidance is based on ${sourceReferences.length} legal source${sourceReferences.length !== 1 ? 's' : ''} and your uploaded evidence. It provides general information about NSW law applicable to your situation.`;
  } else {
    reasoning = 'This is general legal information about NSW law. It is not specific advice for your individual circumstances.';
  }
  
  return {
    score,
    reasoning,
    verification_status,
    source_references: sourceReferences,
    is_legal_advice
  };
}

// Intent classification for routing to specialized functions
async function classifyIntent(message: string, lovableApiKey: string): Promise<{
  intent: 'general_chat' | 'legal_research' | 'case_strength_analysis',
  confidence: number,
  reasoning: string
}> {
  const intentPrompt = `Classify the user's intent into one of these categories:

1. "legal_research" - User wants to research specific NSW laws, statutes, case law, or legal definitions
   Examples: "What does section 61 of the Crimes Act say?", "NSW case law about custody", "Domestic Violence Order legislation"

2. "case_strength_analysis" - User wants to evaluate their case strength or chances of success
   Examples: "How strong is my case?", "What are my chances?", "Evaluate my evidence", "Is this enough evidence?"

3. "general_chat" - General conversation, advice, questions about process, emotional support
   Examples: "What should I do next?", "I'm feeling overwhelmed", "How do I file a form?", "Tell me about the court process"

User query: "${message}"

Respond with ONLY a JSON object: {"intent": "...", "confidence": 0.0-1.0, "reasoning": "..."}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: intentPrompt }],
      temperature: 0.1,
      max_tokens: 150
    })
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    const result = JSON.parse(content.replace(/```json|```/g, '').trim());
    return {
      intent: result.intent || 'general_chat',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Default classification'
    };
  } catch (e) {
    console.warn('Intent classification failed, defaulting to general_chat:', e);
    return { intent: 'general_chat', confidence: 0.5, reasoning: 'Parsing error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { message, context_type, evidence_context } = await req.json();
    console.log(`💬 Chat request from user: ${user.id}`, { context_type });

    // Intent Classification & Routing
    const intentResult = await classifyIntent(message, LOVABLE_API_KEY);
    console.log('🎯 Intent classified:', intentResult);

    // Route to specialized function if confidence is high
    if (intentResult.confidence > 0.7) {
      if (intentResult.intent === 'legal_research') {
        console.log('📚 Routing to NSW RAG Assistant...');
        const { data: ragData, error: ragError } = await supabase.functions.invoke('nsw-rag-assistant', {
          body: { 
            query: message,
            includeEvidence: true,
            mode: 'user',
            jurisdiction: 'NSW',
            citationMode: false
          }
        });

        if (!ragError && ragData) {
          // Save user message
          await supabase.from('messages').insert({
            user_id: user.id,
            role: 'user',
            content: message,
            created_at: new Date().toISOString()
          });

          // Save assistant response with citations
          const assistantContent = ragData.answer;
          await supabase.from('messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
            citations: ragData.citations || [],
            confidence_score: ragData.confidence_score,
            verification_status: 'ai_generated',
            source_references: (ragData.citations || []).map((c: any) => ({
              type: c.citation_type,
              citation: c.short_citation,
              url: c.url
            })),
            created_at: new Date().toISOString()
          });

          return new Response(JSON.stringify({ 
            content: assistantContent,
            citations: ragData.citations,
            routed_to: 'nsw-rag-assistant'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (intentResult.intent === 'case_strength_analysis') {
        console.log('💪 Routing to Case Strength Analyzer...');
        const { data: strengthData, error: strengthError } = await supabase.functions.invoke('analyze-case-strength', {
          body: { user_id: user.id }
        });

        if (!strengthError && strengthData) {
          // Save user message
          await supabase.from('messages').insert({
            user_id: user.id,
            role: 'user',
            content: message,
            created_at: new Date().toISOString()
          });

          // Generate natural language response from strength data
          const naturalResponse = `Based on my analysis of your evidence and case details:

**Case Strength: ${Math.round(strengthData.case_strength_score * 100)}%**

${strengthData.strengths?.map((s: string) => `✓ ${s}`).join('\n')}

${strengthData.weaknesses?.length > 0 ? `\n**Areas to strengthen:**\n${strengthData.weaknesses.map((w: string) => `• ${w}`).join('\n')}` : ''}

${strengthData.next_steps?.length > 0 ? `\n**Recommended next steps:**\n${strengthData.next_steps.slice(0, 2).map((n: string) => `1. ${n}`).join('\n')}` : ''}

Would you like me to help you address any of these areas?`;

          // Save assistant response
          await supabase.from('messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: naturalResponse,
            confidence_score: 0.9,
            verification_status: 'ai_generated',
            reasoning: 'Analysis based on uploaded evidence and case memory',
            created_at: new Date().toISOString()
          });

          return new Response(JSON.stringify({ 
            content: naturalResponse,
            routed_to: 'analyze-case-strength'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // Fall through to general chat flow if routing didn't work
    console.log('💬 Using general chat flow (no routing or routing failed)');

    // 1. Load conversation history (last 50 messages)
    const { data: historyData } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const conversationHistory = (historyData || []).reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    // 2. Load case memory (including personalization profile)
    const { data: caseMemory } = await supabase
      .from('case_memory')
      .select('primary_goal, current_stage, case_readiness_status, key_facts, evidence_index, personalization_profile')
      .eq('user_id', user.id)
      .single();

    // 3. Load user evidence files (get chunks text directly)
    const { data: files } = await supabase
      .from('files')
      .select('id, name, status')
      .eq('user_id', user.id)
      .eq('status', 'processed')
      .order('created_at', { ascending: false })
      .limit(10);

    let evidenceText = '';
    if (files && files.length > 0) {
      const fileIds = files.map(f => f.id);
      const { data: chunks } = await supabase
        .from('chunks')
        .select('text, file_id')
        .in('file_id', fileIds)
        .order('seq', { ascending: true });

      if (chunks && chunks.length > 0) {
        const fileChunksMap = new Map<string, string[]>();
        chunks.forEach(chunk => {
          if (!fileChunksMap.has(chunk.file_id)) {
            fileChunksMap.set(chunk.file_id, []);
          }
          fileChunksMap.get(chunk.file_id)!.push(chunk.text);
        });

        evidenceText = '\n\n## USER EVIDENCE FILES:\n';
        files.forEach(file => {
          const fileChunks = fileChunksMap.get(file.id) || [];
          if (fileChunks.length > 0) {
            evidenceText += `\n### File: ${file.name}\n${fileChunks.join('\n\n')}\n`;
          }
        });
      }
    }

    // 4. Load NSW legal context (full-text search based on user message)
    let legalContext = '';
    
    // Extract keywords from user message for legal search
    const messageKeywords = message.toLowerCase();
    
    // Search legal sections using full-text search
    const { data: legalSections } = await supabase
      .from('legal_sections')
      .select('title, content, citation_reference, legal_concepts')
      .textSearch('tsv', messageKeywords, {
        type: 'websearch',
        config: 'english'
      })
      .limit(5);

    if (legalSections && legalSections.length > 0) {
      legalContext = '\n\n## RELEVANT NSW LEGAL INFORMATION:\n';
      legalSections.forEach(section => {
        legalContext += `\n### ${section.title}\n`;
        if (section.citation_reference) {
          legalContext += `**Citation**: ${section.citation_reference}\n`;
        }
        if (section.legal_concepts && section.legal_concepts.length > 0) {
          legalContext += `**Key Concepts**: ${section.legal_concepts.join(', ')}\n`;
        }
        legalContext += `\n${section.content}\n`;
      });
    }

    // 5. Build stage-specific guidance and extract personalization
    const STAGE_GUIDANCE = {
      1: "Focus: Safety assessment and trust-building. Ask about immediate safety, validate their decision to seek help.",
      2: "Focus: Information gathering. Break questions into manageable chunks, normalize trauma responses.",
      3: "Focus: Goal clarification. Help articulate clear goals, explain NSW legal pathways simply.",
      4: "Focus: Evidence collection. Guide systematic gathering, validate emotional responses.",
      5: "Focus: Legal strategy. Present 2-3 options with clear pros/cons, set realistic expectations.",
      6: "Focus: Case readiness check. Review preparedness, identify ONE key gap to address.",
      7: "Focus: Form completion. Guide through one court form at a time, prepare supporting docs.",
      8: "Focus: Court preparation. Explain process step-by-step, practice one thing at a time.",
      9: "Focus: Post-court support. Review outcomes, plan immediate next step, celebrate progress."
    };

    const stageGuidance = STAGE_GUIDANCE[caseMemory?.current_stage || 1] || STAGE_GUIDANCE[1];
    const profile = caseMemory?.personalization_profile || {};
    const userName = profile.name || 'this user';
    const communicationStyle = profile.communication_style || 'concise'; // concise/detailed/balanced
    const experienceLevel = profile.experience_level || 'first_time'; // first_time/some_experience/experienced

    // Special handling for evidence upload context
    if (context_type === 'evidence_uploaded' && evidence_context) {
      const systemPrompt = `You just analyzed new evidence for ${userName}: "${evidence_context.file_name}"

ANALYSIS RESULTS:
- Timeline Events Extracted: ${evidence_context.timeline_events}
- Case Strength Impact: ${evidence_context.case_strength_change > 0 ? '+' : ''}${evidence_context.case_strength_change} points
- New Case Strength: ${evidence_context.new_case_strength}%
- Primary Goal: "${evidence_context.primary_goal}"

KEY FINDINGS:
${evidence_context.strengths?.map((s: string) => `✓ ${s}`).join('\n') || 'Analysis in progress'}

${evidence_context.critical_gaps?.length > 0 ? `EVIDENCE GAPS IDENTIFIED:\n${evidence_context.critical_gaps.map((g: string) => `• ${g}`).join('\n')}` : ''}

YOUR TASK:
1. Acknowledge the evidence they uploaded (mention "${evidence_context.file_name}" by name)
2. Highlight the 1-2 MOST IMPORTANT findings from this evidence
3. Connect it directly to their goal: "${evidence_context.primary_goal}"
4. If case strength improved, celebrate their progress briefly
5. Ask ONE focused question about the NEXT most important piece of evidence they should gather
6. Keep it warm and encouraging - they're making real progress

TONE: Proactive, strategic, encouraging, trauma-informed
LENGTH: 2-3 short paragraphs maximum (under 200 words total)
STRUCTURE: Natural conversation, not lists

EXAMPLE GOOD RESPONSE:
"I've just analyzed the Police Report from September 2024. This is really valuable evidence - it documents three separate incidents where Peter displayed controlling behavior. The officer's notes about Dylan being afraid directly support your case for sole parental responsibility under s60CC.

This evidence strengthens your case by 15%, bringing you to 73% overall. You're building a solid foundation.

To make this even stronger: do you have any text messages or emails from Peter around the dates of these incidents? Messages before or after often show the pattern of escalation that courts look for."

DO NOT write lists or multiple options. Write naturally as if speaking directly to them.`;

      // Generate proactive response
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate a proactive analysis message for the evidence upload.` }
          ],
          temperature: 0.8,
          max_tokens: 300
        })
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to generate proactive message');
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || 'Evidence analyzed successfully.';

      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Regular chat flow
    const systemPrompt = `You are Veronica, a trauma-informed NSW legal assistant. Guide ${userName} step-by-step toward their goal: "${caseMemory?.primary_goal || 'understanding their legal options'}".

CRITICAL RESPONSE RULES:
1. BREVITY: ${communicationStyle === 'concise' ? 'Maximum 2 short paragraphs' : communicationStyle === 'detailed' ? 'Maximum 3 focused paragraphs' : 'Maximum 2-3 clear points'}
2. STRUCTURE: Always follow this exact pattern:
   - Acknowledge what they shared (1 sentence)
   - Provide 1-2 key insights (directly related to their GOAL)
   - Ask ONE focused question OR suggest ONE concrete next step
3. NO LISTS: Avoid bullet points or numbered lists - speak naturally
4. CITE EVIDENCE: Reference files by name when relevant: "Based on [filename]..."
5. NSW LAW: Cite sections when applicable: "Under s61EA Crimes Act 1900 (NSW)..."

USER CONTEXT:
- Primary Goal: "${caseMemory?.primary_goal || 'Not set'}"
- Current Stage: ${caseMemory?.current_stage || 1}/9 - ${stageGuidance}
- Experience Level: ${experienceLevel}
- Communication Style: ${communicationStyle}
- Case Readiness: ${caseMemory?.case_readiness_status || 'collecting'}

${experienceLevel === 'first_time' ? 'EXPLAIN legal terms simply. Avoid jargon.' : experienceLevel === 'experienced' ? 'Be direct and strategic. Assume legal literacy.' : 'Balance explanation with efficiency.'}

USER'S EVIDENCE:
${evidenceText || 'No evidence uploaded yet'}

RELEVANT NSW LAW:
${legalContext || 'No specific legal context loaded'}

EXAMPLE GOOD RESPONSE:
"I can see from [Police Report Sept 2024] that there were three documented incidents. This strengthens your case significantly under NSW coercive control laws. What dates did the other controlling behaviors you mentioned occur?"

EXAMPLE BAD RESPONSE (TOO LONG):
[Avoid long explanations with multiple points, lists, or information dumps]

Remember: Guide, don't overwhelm. Each response should move ${userName} ONE step closer to: "${caseMemory?.primary_goal}".`;

    // 6. Call Lovable AI with Gemini
    console.log('🤖 Calling Lovable AI (google/gemini-2.5-flash)...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: communicationStyle === 'concise' ? 300 : communicationStyle === 'detailed' ? 600 : 450
      })
    });

    // Handle specific error codes
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait 30 seconds and try again.',
          code: 'RATE_LIMIT'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits depleted. Please add credits in Settings > Workspace > Usage.',
          code: 'CREDITS_REQUIRED'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const errorText = await aiResponse.text();
      console.error('❌ Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${errorText}`);
    }

    // 7. Save user message to database
    await supabase.from('messages').insert({
      user_id: user.id,
      role: 'user',
      content: message
    });

    // 8. Stream response back to client
    console.log('✅ Streaming response...');
    
    // Create a transform stream to parse SSE and save assistant response
    let assistantContent = '';
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    
    // Process the AI response stream
    (async () => {
      try {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', data);
            }
          }
        }

        // Calculate confidence score and metadata
        const confidenceData = calculateConfidence(assistantContent, legalSections || [], files || []);
        
        // Save complete assistant response to database with confidence metadata
        if (assistantContent) {
          await supabase.from('messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
            confidence_score: confidenceData.score,
            reasoning: confidenceData.reasoning,
            verification_status: confidenceData.verification_status,
            source_references: confidenceData.source_references,
            is_legal_advice: confidenceData.is_legal_advice
          });
        }

        await writer.write(new TextEncoder().encode('data: [DONE]\n\n'));
        await writer.close();
      } catch (error) {
        console.error('❌ Stream processing error:', error);
        await writer.abort(error);
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('❌ Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
