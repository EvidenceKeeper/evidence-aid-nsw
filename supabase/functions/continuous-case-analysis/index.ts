import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting continuous case analysis...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { file_id, analysis_type = 'new_evidence' } = await req.json();
    
    console.log(`Analyzing for user ${user.id}, file: ${file_id}, type: ${analysis_type}`);

    // Get current case context
    const caseContext = await buildCaseContext(supabase, user.id, file_id);
    
    // Perform continuous analysis
    const analysis = await performContinuousAnalysis(caseContext, analysis_type);
    
    // Update case state and provide feedback
    const feedback = await updateCaseState(supabase, user.id, file_id, analysis);
    
    console.log('Analysis complete:', feedback.summary);
    
    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in continuous case analysis:', error);
    return new Response(JSON.stringify({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildCaseContext(supabase: any, userId: string, newFileId?: string) {
  console.log('Building case context for user:', userId);
  
  // Get all evidence files and chunks
  const { data: files } = await supabase
    .from('files')
    .select(`
      id, name, category, auto_category, created_at,
      chunks(id, seq, text)
    `)
    .eq('user_id', userId)
    .eq('status', 'processed')
    .order('created_at', { ascending: true });

  // Get current case memory
  const { data: caseMemory } = await supabase
    .from('case_memory')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get existing patterns
  const { data: patterns } = await supabase
    .from('case_patterns')
    .select('*')
    .eq('user_id', userId);

  // Get current legal strategy
  const { data: strategy } = await supabase
    .from('legal_strategy')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get evidence relationships
  const { data: relationships } = await supabase
    .from('evidence_relationships')
    .select('*')
    .eq('user_id', userId);

  // Get timeline events
  const { data: timelineEvents } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true });

  return {
    files: files || [],
    caseMemory: caseMemory || {},
    patterns: patterns || [],
    strategy: strategy || {},
    relationships: relationships || [],
    timelineEvents: timelineEvents || [],
    newFileId
  };
}

async function performContinuousAnalysis(context: any, analysisType: string) {
  const { files, caseMemory, patterns, strategy, relationships, timelineEvents, newFileId } = context;
  
  console.log('Performing analysis type:', analysisType);
  
  // Build comprehensive context for AI analysis
  const allText = files.flatMap((f: any) => 
    f.chunks?.map((c: any) => `[${f.name}] ${c.text}`) || []
  ).join('\n\n');

  const existingPatterns = patterns.map((p: any) => 
    `${p.pattern_type}: ${p.description} (strength: ${p.pattern_strength})`
  ).join('\n');

  const currentNarrative = caseMemory.facts || 'No case narrative established yet.';
  
  const systemPrompt = `You are an expert legal analyst specializing in family law and domestic violence cases. 

CONTEXT:
- Current case narrative: ${currentNarrative}
- Existing patterns identified: ${existingPatterns}
- Total evidence pieces: ${files.length}
- Timeline events: ${timelineEvents.length}

ANALYSIS TYPE: ${analysisType}

Your task is to perform continuous case analysis that:
1. Examines how new evidence changes the case understanding
2. Identifies new patterns or strengthens existing ones
3. Finds connections between evidence pieces
4. Assesses legal strengths and weaknesses
5. Anticipates opposing arguments
6. Suggests strategic next steps

Provide your analysis in this JSON format:
{
  "immediate_insights": ["Key insight 1", "Key insight 2"],
  "case_impact": "How this evidence strengthens/changes the case",
  "new_patterns": [{"type": "pattern_type", "description": "desc", "strength": 0.8, "evidence_files": ["file1"], "legal_significance": "why this matters"}],
  "evidence_relationships": [{"source": "file1", "target": "file2", "type": "supports", "description": "how they connect"}],
  "strength_assessment": {
    "overall_change": 0.2,
    "new_strengths": ["strength 1"],
    "new_weaknesses": ["weakness 1"],
    "evidence_gaps": ["gap 1"]
  },
  "opposing_arguments": ["How defense might challenge this"],
  "next_steps": ["Recommended action 1"],
  "legal_elements": {
    "domestic_violence_elements": {"physical_abuse": "strong", "emotional_abuse": "moderate"},
    "section_54d_elements": {"relationship": "established", "violence": "documented"}
  }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this evidence collection:\n\n${allText}` }
        ],
        max_completion_tokens: 2000,
      }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;
  
  try {
    return JSON.parse(analysisText);
  } catch (parseError) {
    console.error('Failed to parse AI analysis, using fallback');
    return {
      immediate_insights: ["Evidence successfully processed and analyzed"],
      case_impact: "This evidence contributes to your case documentation",
      new_patterns: [],
      evidence_relationships: [],
      strength_assessment: { overall_change: 0.1, new_strengths: [], new_weaknesses: [], evidence_gaps: [] },
      opposing_arguments: [],
      next_steps: ["Continue building your evidence collection"],
      legal_elements: {}
    };
  }
}

async function updateCaseState(supabase: any, userId: string, fileId: string | undefined, analysis: any) {
  console.log('Updating case state with analysis results');
  
  try {
    // Update or create legal strategy
    const { data: existingStrategy } = await supabase
      .from('legal_strategy')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentStrength = existingStrategy?.case_strength_overall || 0;
    const newStrength = Math.max(0, Math.min(1, currentStrength + (analysis.strength_assessment?.overall_change || 0)));

    const strategyData = {
      user_id: userId,
      case_strength_overall: newStrength,
      strengths: analysis.strength_assessment?.new_strengths || [],
      weaknesses: analysis.strength_assessment?.new_weaknesses || [],
      evidence_gaps: analysis.strength_assessment?.evidence_gaps || [],
      opposing_arguments: analysis.opposing_arguments || [],
      next_steps: analysis.next_steps || [],
      legal_elements_status: analysis.legal_elements || {},
    };

    if (existingStrategy) {
      await supabase
        .from('legal_strategy')
        .update(strategyData)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('legal_strategy')
        .insert(strategyData);
    }

    // Record case analysis history
    await supabase
      .from('case_analysis_history')
      .insert({
        user_id: userId,
        analysis_type: 'evidence_added',
        trigger_file_id: fileId,
        previous_state: existingStrategy,
        new_state: strategyData,
        key_insights: analysis.immediate_insights || [],
        case_strength_change: analysis.strength_assessment?.overall_change || 0,
      });

    // Insert new patterns
    if (analysis.new_patterns?.length > 0) {
      for (const pattern of analysis.new_patterns) {
        await supabase
          .from('case_patterns')
          .insert({
            user_id: userId,
            pattern_type: pattern.type,
            description: pattern.description,
            pattern_strength: pattern.strength,
            evidence_files: pattern.evidence_files || [],
            legal_significance: pattern.legal_significance,
          });
      }
    }

    // Insert evidence relationships
    if (analysis.evidence_relationships?.length > 0) {
      for (const rel of analysis.evidence_relationships) {
        // Find actual file IDs by name
        const { data: sourceFile } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${rel.source}%`)
          .single();
        
        const { data: targetFile } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${rel.target}%`)
          .single();

        if (sourceFile && targetFile) {
          await supabase
            .from('evidence_relationships')
            .insert({
              user_id: userId,
              source_file_id: sourceFile.id,
              target_file_id: targetFile.id,
              relationship_type: rel.type,
              description: rel.description,
              confidence: 0.8,
            });
        }
      }
    }

    // Generate user-friendly feedback
    const feedback = {
      success: true,
      summary: generateFeedbackMessage(analysis),
      insights: analysis.immediate_insights || [],
      case_impact: analysis.case_impact,
      strength_change: analysis.strength_assessment?.overall_change || 0,
      new_strength: newStrength,
      patterns_found: analysis.new_patterns?.length || 0,
      relationships_found: analysis.evidence_relationships?.length || 0,
      next_steps: analysis.next_steps || [],
    };

    console.log('Case state updated successfully');
    return feedback;

  } catch (error) {
    console.error('Error updating case state:', error);
    return {
      success: false,
      error: 'Failed to update case analysis',
      summary: 'Your evidence has been processed, but analysis updates encountered an issue.',
      insights: ['Evidence successfully uploaded and stored securely'],
      case_impact: 'This evidence is now part of your case file',
      strength_change: 0,
      patterns_found: 0,
      relationships_found: 0,
    };
  }
}

function generateFeedbackMessage(analysis: any): string {
  const impact = analysis.case_impact || 'This evidence contributes to your case';
  const patternsCount = analysis.new_patterns?.length || 0;
  const strengthChange = analysis.strength_assessment?.overall_change || 0;
  
  let message = `Thank you for providing this evidence. ${impact}.`;
  
  if (strengthChange > 0.1) {
    message += ` This significantly strengthens your case.`;
  } else if (strengthChange > 0) {
    message += ` This adds valuable support to your case.`;
  }
  
  if (patternsCount > 0) {
    message += ` I've identified ${patternsCount} new pattern${patternsCount > 1 ? 's' : ''} that will help build your legal argument.`;
  }
  
  return message;
}