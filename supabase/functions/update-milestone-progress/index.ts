import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { conversation_summary, new_evidence_ids } = await req.json();

    // Load active case plan
    const { data: caseMemory } = await supabaseClient
      .from('case_memory')
      .select('active_case_plan_id')
      .eq('user_id', user.id)
      .single();

    if (!caseMemory?.active_case_plan_id) {
      return new Response(
        JSON.stringify({ message: 'No active case plan' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: casePlan } = await supabaseClient
      .from('case_plans')
      .select('*')
      .eq('id', caseMemory.active_case_plan_id)
      .single();

    if (!casePlan) {
      throw new Error('Case plan not found');
    }

    const milestones = casePlan.milestones as any[];
    const currentIndex = casePlan.current_milestone_index;
    const currentMilestone = milestones[currentIndex];

    // Get current progress
    const { data: progress } = await supabaseClient
      .from('milestone_progress')
      .select('*')
      .eq('case_plan_id', casePlan.id)
      .eq('milestone_index', currentIndex)
      .single();

    if (!progress) {
      throw new Error('Progress record not found');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use AI to evaluate progress
    const systemPrompt = `You are evaluating progress on a legal case milestone.

Current Milestone: "${currentMilestone.title}"
Description: ${currentMilestone.description}
Success Criteria:
${currentMilestone.success_criteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

Current Progress: ${progress.completion_percentage}%
Evidence Already Collected: ${JSON.stringify(progress.evidence_collected)}

Based on the new conversation/evidence, determine:
1. Updated completion percentage (0-100)
2. Which success criteria are now met
3. Whether milestone is complete
4. What's still needed
5. Next specific action to recommend`;

    const userPrompt = `New Conversation Summary: ${conversation_summary || 'None'}
New Evidence IDs: ${new_evidence_ids?.join(', ') || 'None'}

Evaluate progress on this milestone.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'update_progress',
            description: 'Update milestone progress based on analysis',
            parameters: {
              type: 'object',
              properties: {
                completion_percentage: { type: 'number', minimum: 0, maximum: 100 },
                criteria_met: {
                  type: 'array',
                  items: { type: 'string' }
                },
                is_complete: { type: 'boolean' },
                whats_needed: {
                  type: 'array',
                  items: { type: 'string' }
                },
                next_action: { type: 'string' }
              },
              required: ['completion_percentage', 'criteria_met', 'is_complete', 'whats_needed', 'next_action']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'update_progress' } }
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const evaluation = JSON.parse(toolCall.function.arguments);

    // Update progress record
    const evidenceCollected = [...(progress.evidence_collected as any[] || [])];
    if (new_evidence_ids) {
      evidenceCollected.push(...new_evidence_ids.map((id: string) => ({
        file_id: id,
        added_at: new Date().toISOString()
      })));
    }

    const { error: updateError } = await supabaseClient
      .from('milestone_progress')
      .update({
        completion_percentage: evaluation.completion_percentage,
        status: evaluation.is_complete ? 'complete' : 'in_progress',
        completed_at: evaluation.is_complete ? new Date().toISOString() : null,
        evidence_collected: evidenceCollected,
        notes: `Criteria met: ${evaluation.criteria_met.join(', ')}. Still needed: ${evaluation.whats_needed.join(', ')}`
      })
      .eq('id', progress.id);

    if (updateError) throw updateError;

    // If milestone complete, advance to next
    let advancedToNext = false;
    if (evaluation.is_complete && currentIndex < milestones.length - 1) {
      const { error: advanceError } = await supabaseClient
        .from('case_plans')
        .update({
          current_milestone_index: currentIndex + 1,
          overall_progress_percentage: Math.round(((currentIndex + 1) / milestones.length) * 100)
        })
        .eq('id', casePlan.id);

      if (!advanceError) {
        // Mark next milestone as in_progress
        await supabaseClient
          .from('milestone_progress')
          .update({ status: 'in_progress' })
          .eq('case_plan_id', casePlan.id)
          .eq('milestone_index', currentIndex + 1);

        advancedToNext = true;
      }
    } else if (evaluation.is_complete && currentIndex === milestones.length - 1) {
      // Last milestone complete - update overall percentage
      await supabaseClient
        .from('case_plans')
        .update({ overall_progress_percentage: 100 })
        .eq('id', casePlan.id);
    }

    return new Response(
      JSON.stringify({
        milestone_status: evaluation.is_complete ? 'complete' : 'in_progress',
        progress_percentage: evaluation.completion_percentage,
        next_action: evaluation.next_action,
        criteria_met: evaluation.criteria_met,
        whats_needed: evaluation.whats_needed,
        advanced_to_next_milestone: advancedToNext,
        next_milestone: advancedToNext ? milestones[currentIndex + 1] : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating milestone progress:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});