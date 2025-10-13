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

    const { user_id } = await req.json();
    console.log(`💪 Analyzing case strength for user: ${user_id}`);

    // Get user's primary goal
    const { data: caseMemory } = await supabase
      .from('case_memory')
      .select('primary_goal, case_strength_score, case_strength_reasons')
      .eq('user_id', user_id)
      .single();

    const primaryGoal = caseMemory?.primary_goal || 'General legal case';
    const previousStrength = caseMemory?.case_strength_score || 0;

    // Get all user's evidence files
    const { data: files } = await supabase
      .from('files')
      .select('id, name, status')
      .eq('user_id', user_id)
      .eq('status', 'processed');

    // Get evidence analysis results
    const { data: analyses } = await supabase
      .from('evidence_analysis')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get timeline events
    const { data: timelineEvents } = await supabase
      .from('enhanced_timeline_events')
      .select('*')
      .eq('user_id', user_id)
      .order('event_date', { ascending: true });

    // Get legal connections
    const { data: legalConnections } = await supabase
      .from('evidence_legal_connections')
      .select('*')
      .eq('user_id', user_id)
      .gte('relevance_score', 0.6);

    // Calculate case strength based on evidence quality
    const caseStrength = calculateCaseStrength(
      files || [],
      analyses || [],
      timelineEvents || [],
      legalConnections || [],
      primaryGoal
    );

    console.log('📊 Case Strength Analysis:', caseStrength);

    return new Response(JSON.stringify({
      ...caseStrength,
      strength_change: caseStrength.case_strength_score - previousStrength
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Case strength analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Analysis failed',
      code: 'ANALYSIS_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function calculateCaseStrength(
  files: any[],
  analyses: any[],
  timelineEvents: any[],
  legalConnections: any[],
  primaryGoal: string
) {
  let baseScore = 0;
  const strengths: string[] = [];
  const critical_gaps: string[] = [];
  const legal_elements_met: Record<string, number> = {};

  // Evidence quantity (0-20 points)
  const evidenceCount = files.length;
  if (evidenceCount === 0) {
    baseScore += 0;
    critical_gaps.push('No evidence uploaded yet');
  } else if (evidenceCount < 3) {
    baseScore += 10;
    critical_gaps.push('Limited evidence - need more documentation');
  } else if (evidenceCount < 5) {
    baseScore += 15;
    strengths.push(`${evidenceCount} pieces of evidence collected`);
  } else {
    baseScore += 20;
    strengths.push(`Strong evidence base with ${evidenceCount} documents`);
  }

  // Timeline documentation (0-20 points)
  const timelineCount = timelineEvents.length;
  if (timelineCount === 0) {
    baseScore += 0;
    critical_gaps.push('No timeline events documented');
  } else if (timelineCount < 5) {
    baseScore += 10;
  } else if (timelineCount < 10) {
    baseScore += 15;
    strengths.push(`Clear timeline with ${timelineCount} documented events`);
  } else {
    baseScore += 20;
    strengths.push(`Comprehensive timeline documenting ${timelineCount} events`);
  }

  // Legal connections (0-30 points)
  const connectionsCount = legalConnections.length;
  if (connectionsCount === 0) {
    baseScore += 0;
    critical_gaps.push('No legal connections identified yet');
  } else if (connectionsCount < 3) {
    baseScore += 15;
  } else if (connectionsCount < 6) {
    baseScore += 22;
    strengths.push(`Evidence linked to ${connectionsCount} legal provisions`);
  } else {
    baseScore += 30;
    strengths.push(`Strong legal foundation with ${connectionsCount} evidence-law connections`);
  }

  // Evidence quality from AI analysis (0-30 points)
  if (analyses.length > 0) {
    const avgConfidence = analyses.reduce((sum, a) => sum + (a.confidence_score || 0.5), 0) / analyses.length;
    const qualityScore = Math.round(avgConfidence * 30);
    baseScore += qualityScore;
    
    if (avgConfidence > 0.7) {
      strengths.push('High-quality, credible evidence');
    }
  } else {
    critical_gaps.push('Evidence analysis pending');
  }

  // Goal-specific requirements
  if (primaryGoal.toLowerCase().includes('parental responsibility') || 
      primaryGoal.toLowerCase().includes('custody')) {
    
    legal_elements_met['family_violence_s4AB'] = connectionsCount > 0 ? 0.7 : 0.2;
    legal_elements_met['best_interests_children_s60CC'] = timelineCount > 5 ? 0.6 : 0.3;
    legal_elements_met['pattern_of_behavior'] = timelineCount > 3 ? 0.8 : 0.2;
    
    if (connectionsCount === 0) {
      critical_gaps.push('Need documentation of family violence under s4AB');
    }
    if (timelineCount < 3) {
      critical_gaps.push('Need more evidence of pattern of behavior');
    }
  }

  // Recommendations based on gaps
  const strategic_next_steps: string[] = [];
  if (evidenceCount < 5) {
    strategic_next_steps.push('Upload more supporting documents (police reports, messages, medical records)');
  }
  if (timelineCount < 5) {
    strategic_next_steps.push('Document specific incidents with dates, times, and details');
  }
  if (connectionsCount < 3) {
    strategic_next_steps.push('Request legal analysis of uploaded evidence');
  }

  return {
    case_strength_score: Math.min(100, baseScore),
    strengths,
    critical_gaps,
    legal_elements_met,
    strategic_next_steps,
    evidence_summary: {
      total_files: evidenceCount,
      timeline_events: timelineCount,
      legal_connections: connectionsCount,
      analyses_completed: analyses.length
    }
  };
}
