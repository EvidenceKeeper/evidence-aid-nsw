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
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { file_id, file_name, user_id } = await req.json();
    console.log(`🚀 Evidence Orchestrator: Processing ${file_name} for user ${user_id}`);

    // Phase 1: Extract timeline events
    console.log('📅 Step 1/5: Extracting timeline events...');
    const timelinePromise = supabase.functions.invoke('extract-timeline', {
      body: { file_id }
    }).catch(err => {
      console.warn('Timeline extraction failed:', err);
      return { data: { events_extracted: 0 }, error: err };
    });

    // Phase 2: Analyze legal relevance
    console.log('⚖️ Step 2/5: Analyzing legal relevance...');
    const legalAnalysisPromise = supabase.functions.invoke('evidence-legal-analyzer', {
      body: { 
        file_id,
        analysis_types: ['legal_relevance', 'case_strength'],
        generate_connections: true
      }
    }).catch(err => {
      console.warn('Legal analysis failed:', err);
      return { data: null, error: err };
    });

    // Phase 3: Analyze case strength impact
    console.log('💪 Step 3/5: Calculating case strength impact...');
    const caseStrengthPromise = supabase.functions.invoke('analyze-case-strength', {
      body: { user_id }
    }).catch(err => {
      console.warn('Case strength analysis failed:', err);
      return { data: null, error: err };
    });

    // Wait for all analyses to complete
    const [timelineResult, legalResult, strengthResult] = await Promise.all([
      timelinePromise,
      legalAnalysisPromise,
      caseStrengthPromise
    ]);

    console.log('✅ All analyses complete:', {
      timeline_events: timelineResult.data?.events_extracted || 0,
      legal_analysis: !!legalResult.data,
      case_strength: strengthResult.data?.case_strength_score || 0
    });

    // Phase 4: Update case memory with insights
    console.log('🧠 Step 4/5: Updating case memory...');
    const { data: caseMemory } = await supabase
      .from('case_memory')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (caseMemory) {
      const updatedEvidenceIndex = [...(caseMemory.evidence_index || []), {
        file_id,
        file_name,
        processed_at: new Date().toISOString(),
        timeline_events: timelineResult.data?.events_extracted || 0,
        legal_connections: legalResult.data?.connections_generated || 0
      }];

      await supabase
        .from('case_memory')
        .update({
          evidence_index: updatedEvidenceIndex,
          case_strength_score: strengthResult.data?.case_strength_score || caseMemory.case_strength_score,
          case_strength_reasons: strengthResult.data?.strengths || caseMemory.case_strength_reasons,
          last_updated_at: new Date().toISOString(),
          last_activity_type: 'evidence_uploaded'
        })
        .eq('user_id', user_id);
    }

    // Phase 5: Generate proactive AI summary
    console.log('🤖 Step 5/5: Generating proactive analysis...');
    const proactiveMessage = await generateProactiveAnalysis(
      supabase,
      user_id,
      file_name,
      timelineResult.data?.events_extracted || 0,
      strengthResult.data || null,
      caseMemory
    );

    console.log('🎉 Evidence orchestration complete!');

    return new Response(JSON.stringify({
      success: true,
      file_id,
      timeline_events: timelineResult.data?.events_extracted || 0,
      legal_connections: legalResult.data?.connections_generated || 0,
      case_strength_score: strengthResult.data?.case_strength_score || 0,
      proactive_message: proactiveMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Orchestrator error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Orchestration failed',
      code: 'ORCHESTRATION_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateProactiveAnalysis(
  supabase: any,
  user_id: string,
  file_name: string,
  timeline_events: number,
  strengthData: any,
  caseMemory: any
) {
  try {
    // Build context for proactive message
    const context = {
      file_name,
      timeline_events,
      case_strength_change: strengthData?.strength_change || 0,
      new_case_strength: strengthData?.case_strength_score || 0,
      strengths: strengthData?.strengths || [],
      critical_gaps: strengthData?.critical_gaps || [],
      primary_goal: caseMemory?.primary_goal || 'understanding your legal options'
    };

    // Call chat-gemini with special evidence_uploaded context
    const { data: aiResponse } = await supabase.functions.invoke('chat-gemini', {
      body: {
        message: `[INTERNAL: Evidence upload notification - do not show this to user]`,
        context_type: 'evidence_uploaded',
        evidence_context: context
      }
    });

    // Save the proactive message to messages table
    if (aiResponse?.content) {
      await supabase.from('messages').insert({
        user_id,
        role: 'assistant',
        content: aiResponse.content,
        meta: {
          type: 'proactive_evidence_analysis',
          file_name,
          generated_at: new Date().toISOString()
        }
      });

      return aiResponse.content;
    }

    return null;
  } catch (error) {
    console.error('Failed to generate proactive analysis:', error);
    return null;
  }
}
