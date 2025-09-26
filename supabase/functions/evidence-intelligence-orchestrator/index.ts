import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { trigger_type = 'manual', file_id } = await req.json();

    console.log(`Starting evidence intelligence orchestration for user: ${user.id}, trigger: ${trigger_type}`);

    let filesToProcess = [];

    if (file_id) {
      // Process specific file
      const { data: file } = await supabase
        .from('files')
        .select('id, name, status')
        .eq('id', file_id)
        .eq('user_id', user.id)
        .single();
      
      if (file && file.status === 'processed') {
        filesToProcess = [file];
      }
    } else {
      // Process all unanalyzed files
      const { data: files } = await supabase
        .from('files')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('status', 'processed');
      
      if (files) {
        // Filter out files that already have comprehensive analysis
        const analyzed = await supabase
          .from('evidence_comprehensive_analysis')
          .select('file_id')
          .eq('user_id', user.id);
        
        const analyzedIds = new Set(analyzed.data?.map(a => a.file_id) || []);
        filesToProcess = files.filter(f => !analyzedIds.has(f.id));
      }
    }

    console.log(`Found ${filesToProcess.length} files to process`);

    if (filesToProcess.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No files need processing",
        files_processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Start comprehensive intelligence processing
    EdgeRuntime.waitUntil(processEvidenceIntelligence(supabase, user.id, filesToProcess));

    return new Response(JSON.stringify({
      success: true,
      message: "Evidence intelligence processing started",
      files_to_process: filesToProcess.length,
      estimated_completion: `${filesToProcess.length * 2}-${filesToProcess.length * 4} minutes`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Evidence intelligence orchestrator error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processEvidenceIntelligence(supabase: any, userId: string, files: any[]) {
  console.log(`Starting comprehensive evidence intelligence for ${files.length} files`);

  for (const file of files) {
    try {
      console.log(`Processing evidence intelligence for: ${file.name}`);

      // Get file chunks
      const { data: chunks } = await supabase
        .from('chunks')
        .select('id, text, seq')
        .eq('file_id', file.id)
        .order('seq');

      if (!chunks || chunks.length === 0) {
        console.log(`No chunks found for file: ${file.id}`);
        continue;
      }

      const fullText = chunks.map(c => c.text).join('\n\n');

      // Multi-pass analysis with different lenses
      const analyses = await Promise.all([
        // Pass 1: Legal significance and case strength
        performMultiLensAnalysis(fullText, file.name, 'legal_significance', userId, file.id),
        
        // Pass 2: Pattern detection and behavioral analysis  
        performMultiLensAnalysis(fullText, file.name, 'behavioral_patterns', userId, file.id),
        
        // Pass 3: Timeline and chronological analysis
        performMultiLensAnalysis(fullText, file.name, 'chronological_analysis', userId, file.id),
        
        // Pass 4: Strategic implications and recommendations
        performMultiLensAnalysis(fullText, file.name, 'strategic_analysis', userId, file.id),

        // Pass 5: Evidence gaps and weaknesses
        performMultiLensAnalysis(fullText, file.name, 'gap_analysis', userId, file.id)
      ]);

      // Synthesize comprehensive understanding
      const synthesis = await synthesizeEvidenceIntelligence(analyses, fullText, file.name);

      // Store comprehensive analysis
      await supabase
        .from('evidence_comprehensive_analysis')
        .insert({
          user_id: userId,
          file_id: file.id,
          analysis_passes: analyses,
          synthesis: synthesis,
          confidence_score: synthesis.overall_confidence,
          legal_strength: synthesis.legal_strength,
          case_impact: synthesis.case_impact,
          key_insights: synthesis.key_insights,
          strategic_recommendations: synthesis.recommendations,
          evidence_gaps_identified: synthesis.gaps,
          pattern_connections: synthesis.patterns,
          timeline_significance: synthesis.timeline_importance
        });

      // Extract and store timeline events
      await extractEnhancedTimeline(supabase, userId, file.id, fullText, chunks);

      // Generate legal connections
      await generateEnhancedLegalConnections(supabase, userId, file.id, fullText, synthesis);

      // Update case intelligence
      await updateCaseIntelligence(supabase, userId, file.id, synthesis);

      console.log(`Completed evidence intelligence for: ${file.name}`);

    } catch (error) {
      console.error(`Error processing file ${file.id}:`, error);
    }

    // Pause between files to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final synthesis across all evidence
  await performCrossEvidenceSynthesis(supabase, userId);
  
  console.log(`Completed comprehensive evidence intelligence for user: ${userId}`);
}

async function performMultiLensAnalysis(text: string, fileName: string, lensType: string, userId: string, fileId: string) {
  const prompts = {
    legal_significance: `
You are a senior NSW family law barrister analyzing evidence for legal significance. Examine this evidence through the lens of legal admissibility, relevance, and strength in family court proceedings.

Evidence: ${fileName}
Content: ${text.substring(0, 6000)}

Provide deep analysis covering:
1. LEGAL ADMISSIBILITY: Hearsay concerns, authentication requirements, reliability factors
2. RELEVANCE: How this evidence supports specific legal elements in family/DV law
3. PROBATIVE VALUE: Strength of evidence vs prejudicial effect
4. CORROBORATION NEEDS: What additional evidence would strengthen this
5. LEGAL ELEMENTS: Which specific statutory requirements this evidence addresses
6. CASE LAW PRECEDENTS: Similar cases where such evidence was considered
7. PROCEDURAL CONSIDERATIONS: Filing requirements, expert evidence needs
8. POTENTIAL CHALLENGES: How opposing counsel might attack this evidence

Format as JSON with detailed analysis in each category.`,

    behavioral_patterns: `
You are a forensic psychologist and DV specialist analyzing evidence for behavioral patterns. Look for systematic patterns of coercive control, escalation, and psychological manipulation.

Evidence: ${fileName}
Content: ${text.substring(0, 6000)}

Analyze for:
1. COERCIVE CONTROL PATTERNS: Systematic control behaviors over time
2. ESCALATION INDICATORS: Increasing frequency, severity, or new control tactics
3. ISOLATION TACTICS: Attempts to separate from support systems
4. FINANCIAL ABUSE: Economic control or financial manipulation
5. MONITORING/SURVEILLANCE: Tracking, checking, controlling communications
6. THREATS AND INTIMIDATION: Direct or implied threats, fear-inducing behavior
7. MANIPULATION TACTICS: Gaslighting, blame-shifting, reality distortion
8. IMPACT ON CHILDREN: Effects of witnessed abuse, involvement of children
9. VICTIM RESPONSES: Fight, flight, freeze responses and survival strategies
10. TRAUMA INDICATORS: Signs of psychological impact and trauma responses

Provide detailed behavioral analysis with specific examples and psychological context.`,

    chronological_analysis: `
You are a case chronology expert analyzing evidence for temporal significance and timeline construction.

Evidence: ${fileName}  
Content: ${text.substring(0, 6000)}

Analyze chronological aspects:
1. KEY DATES AND EVENTS: All specific dates, times, and temporal markers
2. SEQUENCE PATTERNS: Order of events and their logical progression
3. TIMELINE GAPS: Missing periods that need further evidence
4. TEMPORAL RELATIONSHIPS: How events relate to each other over time
5. ESCALATION TIMELINE: Changes in behavior patterns over time
6. LEGAL DEADLINES: Relevant limitation periods or procedural deadlines
7. CONTEXTUAL TIMING: Relationship to other life events, court proceedings
8. FREQUENCY ANALYSIS: Recurring patterns and their timing
9. SEASONAL PATTERNS: Time-of-year correlations with incidents
10. COMMUNICATION PATTERNS: Timing and frequency of contacts

Focus on building a comprehensive chronological narrative with legal significance.`,

    strategic_analysis: `
You are a senior litigation strategist analyzing evidence for strategic case value and tactical considerations.

Evidence: ${fileName}
Content: ${text.substring(0, 6000)}

Provide strategic analysis:
1. CASE NARRATIVE: How this evidence fits the overall case story
2. STRATEGIC VALUE: Relative importance compared to other evidence types
3. PRESENTATION ORDER: Optimal sequencing in case presentation
4. CORROBORATION STRATEGY: What evidence should be paired with this
5. COUNTER-ARGUMENTS: How opposing side will challenge this evidence
6. REBUTTAL PREPARATION: Evidence needed to counter expected challenges
7. SETTLEMENT LEVERAGE: Impact on negotiation position
8. TRIAL PRESENTATION: Most effective way to present to court
9. EXPERT WITNESS NEEDS: Whether expert evidence is needed
10. RISK ASSESSMENT: Potential backfire risks and mitigation strategies

Focus on tactical advantages and strategic positioning.`,

    gap_analysis: `
You are an evidence completeness auditor identifying gaps, weaknesses, and missing elements in the evidence base.

Evidence: ${fileName}
Content: ${text.substring(0, 6000)}

Identify evidence gaps:
1. MISSING DOCUMENTATION: What records are absent but should exist
2. WITNESS EVIDENCE GAPS: Key witnesses not yet identified or contacted
3. CORROBORATION NEEDS: Evidence that lacks independent verification
4. TEMPORAL GAPS: Time periods without sufficient evidence coverage
5. JURISDICTIONAL ISSUES: Cross-border or jurisdiction-specific evidence needs
6. TECHNICAL EVIDENCE: Missing expert analysis or technical reports
7. PROCEDURAL GAPS: Missing affidavits, statements, or formal documents
8. COMPARATIVE EVIDENCE: Missing baseline or comparative information
9. CONTEXT GAPS: Background information that would strengthen the case
10. FUTURE EVIDENCE: Ongoing monitoring or documentation needed

Provide specific recommendations for addressing each identified gap.`
  };

  const prompt = prompts[lensType] || prompts.legal_significance;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert legal analyst providing comprehensive evidence analysis. Always respond with detailed JSON-formatted analysis."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error(`Analysis failed for ${lensType}:`, await response.text());
      return { lens_type: lensType, error: "Analysis failed", content: {} };
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);
    
    return {
      lens_type: lensType,
      analysis: analysis,
      confidence: analysis.confidence || 0.7,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Error in ${lensType} analysis:`, error);
    return { lens_type: lensType, error: error.message, content: {} };
  }
}

async function synthesizeEvidenceIntelligence(analyses: any[], fullText: string, fileName: string) {
  const synthesisPrompt = `
You are a master legal strategist synthesizing multiple expert analyses of evidence into a comprehensive understanding.

Evidence File: ${fileName}

Analysis Results:
${analyses.map(a => `${a.lens_type.toUpperCase()}:\n${JSON.stringify(a.analysis, null, 2)}\n`).join('\n')}

Create a comprehensive synthesis that provides:

1. OVERALL ASSESSMENT: Executive summary of evidence value and significance
2. LEGAL STRENGTH (0-100): Numerical assessment of legal value
3. CASE IMPACT: How this evidence changes the overall case position  
4. KEY INSIGHTS: The most important discoveries from all analyses combined
5. STRATEGIC RECOMMENDATIONS: Specific actions to maximize evidence value
6. EVIDENCE GAPS: Critical missing pieces identified across all analyses
7. PATTERN CONNECTIONS: How behavioral patterns connect to legal requirements
8. TIMELINE IMPORTANCE: Chronological significance in the broader case
9. CORROBORATION PRIORITIES: What evidence should be sought next
10. RISK MITIGATION: Strategies to address identified weaknesses

Provide a synthesis that gives the AI assistant (Veronica) deep understanding of this evidence's role in building a strong legal case.

Respond in JSON format with detailed explanations.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a master legal strategist creating comprehensive evidence synthesis for AI assistant understanding. Provide deep, nuanced analysis."
          },
          {
            role: "user",
            content: synthesisPrompt
          }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("Synthesis failed:", await response.text());
      return { error: "Synthesis failed" };
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);

  } catch (error) {
    console.error("Error in evidence synthesis:", error);
    return { error: error.message };
  }
}

async function extractEnhancedTimeline(supabase: any, userId: string, fileId: string, fullText: string, chunks: any[]) {
  // Enhanced timeline extraction with legal focus
  const timelinePrompt = `
Extract comprehensive timeline events from this evidence with legal significance focus.

Content: ${fullText.substring(0, 8000)}

For each event, provide:
1. date: YYYY-MM-DD format (estimate if unclear)
2. time: HH:MM format if available
3. title: Brief description (2-6 words)
4. description: Detailed description with legal context
5. category: incident|communication|legal_action|medical|financial|threat|violation|escalation|pattern_change
6. confidence: 0.1-1.0 confidence in date accuracy
7. legal_significance: Why this event matters legally
8. evidence_type: direct|circumstantial|corroborative
9. witnesses: Potential witnesses present
10. corroboration_needed: What would verify this event

Focus on events that demonstrate patterns, escalation, violations, or have clear legal relevance.
Return JSON with 'events' array.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "user", content: timelinePrompt }
        ],
        max_completion_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const data = JSON.parse(result.choices[0].message.content);
      const events = data.events || [];

      // Insert enhanced timeline events
      for (const event of events) {
        const relevantChunk = chunks.find(chunk => 
          chunk.text.toLowerCase().includes(event.title.toLowerCase()) ||
          chunk.text.toLowerCase().includes(event.description.toLowerCase())
        ) || chunks[0];

        await supabase
          .from('enhanced_timeline_events')
          .insert({
            user_id: userId,
            file_id: fileId,
            chunk_id: relevantChunk.id,
            event_date: event.date,
            event_time: event.time || null,
            title: event.title,
            description: event.description,
            category: event.category,
            confidence: event.confidence,
            legal_significance: event.legal_significance,
            evidence_type: event.evidence_type,
            potential_witnesses: event.witnesses || [],
            corroboration_needed: event.corroboration_needed,
            context: relevantChunk.text.substring(0, 500)
          });
      }

      console.log(`Extracted ${events.length} enhanced timeline events`);
    }
  } catch (error) {
    console.error("Enhanced timeline extraction failed:", error);
  }
}

async function generateEnhancedLegalConnections(supabase: any, userId: string, fileId: string, fullText: string, synthesis: any) {
  // Generate connections with legal authorities based on synthesis
  console.log("Generating enhanced legal connections...");
  
  // This would invoke the enhanced legal connection analysis
  try {
    await supabase.functions.invoke('evidence-legal-analyzer', {
      body: { 
        file_id: fileId,
        analysis_types: ['legal_relevance', 'case_strength', 'pattern_detection'],
        generate_connections: true,
        synthesis_context: synthesis
      }
    });
  } catch (error) {
    console.error("Enhanced legal connections failed:", error);
  }
}

async function updateCaseIntelligence(supabase: any, userId: string, fileId: string, synthesis: any) {
  // Update overall case intelligence based on new evidence analysis
  console.log("Updating case intelligence...");
  
  try {
    await supabase.functions.invoke('continuous-case-analysis', {
      body: {
        file_id: fileId,
        analysis_type: 'evidence_integration',
        trigger: 'new_evidence_processed'
      }
    });
  } catch (error) {
    console.error("Case intelligence update failed:", error);
  }
}

async function performCrossEvidenceSynthesis(supabase: any, userId: string) {
  // Final analysis connecting insights across all evidence files
  console.log("Performing cross-evidence synthesis...");
  
  try {
    await supabase.functions.invoke('continuous-case-analysis', {
      body: {
        analysis_type: 'comprehensive_synthesis',
        trigger: 'evidence_intelligence_complete'
      }
    });
  } catch (error) {
    console.error("Cross-evidence synthesis failed:", error);
  }
}