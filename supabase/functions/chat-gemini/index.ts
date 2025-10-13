import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { message } = await req.json();
    console.log(`💬 Chat request from user: ${user.id}`);

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

        // Save complete assistant response to database
        if (assistantContent) {
          await supabase.from('messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: assistantContent
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
