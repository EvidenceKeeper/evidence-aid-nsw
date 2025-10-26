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

    const { primary_goal, case_type, context } = await req.json();
    console.log('Generating case plan for:', { primary_goal, case_type });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use AI to generate milestone plan
    const systemPrompt = `You are a legal case planning expert specializing in NSW, Australia family law and domestic violence cases.

Given a user's primary legal goal, generate 5-7 specific, actionable milestones that will help them achieve that goal.

Each milestone should:
1. Be specific and measurable
2. Have clear success criteria (2-4 items)
3. Build progressively toward the goal
4. Be realistic and achievable
5. Include estimated timeframes

Format as JSON array of milestone objects with:
- title: Clear, action-oriented title (e.g., "Document pattern of control")
- description: 1-2 sentence explanation of what this milestone involves
- success_criteria: Array of 2-4 specific, measurable criteria
- estimated_days: Realistic timeframe in days
- priority: "urgent", "high", "medium", or "low"
- category: "evidence", "legal", "safety", "documentation", or "preparation"`;

    const userPrompt = `Primary Goal: "${primary_goal}"
Case Type: ${case_type || 'General family law'}
Context: ${context || 'No additional context provided'}

Generate a strategic milestone plan that will help this person achieve their goal.`;

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
            name: 'create_milestone_plan',
            description: 'Return a structured case milestone plan',
            parameters: {
              type: 'object',
              properties: {
                milestones: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      success_criteria: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      estimated_days: { type: 'number' },
                      priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
                      category: { type: 'string', enum: ['evidence', 'legal', 'safety', 'documentation', 'preparation'] }
                    },
                    required: ['title', 'description', 'success_criteria', 'estimated_days', 'priority', 'category']
                  }
                }
              },
              required: ['milestones']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_milestone_plan' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    const toolCall = aiResponse.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const milestones = JSON.parse(toolCall.function.arguments).milestones;

    // Create case plan in database
    const { data: casePlan, error: planError } = await supabaseClient
      .from('case_plans')
      .insert({
        user_id: user.id,
        primary_goal,
        milestones,
        current_milestone_index: 0,
        overall_progress_percentage: 0,
        urgency_level: milestones.some((m: any) => m.priority === 'urgent') ? 'urgent' : 'normal'
      })
      .select()
      .single();

    if (planError) throw planError;

    // Create milestone progress records
    const progressRecords = milestones.map((milestone: any, index: number) => ({
      case_plan_id: casePlan.id,
      milestone_index: index,
      status: index === 0 ? 'in_progress' : 'not_started',
      completion_percentage: 0,
      evidence_collected: []
    }));

    const { error: progressError } = await supabaseClient
      .from('milestone_progress')
      .insert(progressRecords);

    if (progressError) throw progressError;

    // Link to case_memory
    const { error: memoryError } = await supabaseClient
      .from('case_memory')
      .upsert({
        user_id: user.id,
        active_case_plan_id: casePlan.id,
        primary_goal,
        goal_status: 'active',
        goal_established_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (memoryError) throw memoryError;

    return new Response(
      JSON.stringify({
        case_plan: casePlan,
        milestones,
        message: `Created ${milestones.length}-step plan for: ${primary_goal}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating case plan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});