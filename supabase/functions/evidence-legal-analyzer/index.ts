import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Rate limiting: 10 requests per minute for evidence analysis
    const windowMs = 60_000;
    const limit = 10;
    const sinceIso = new Date(Date.now() - windowMs).toISOString();

    const { count, error: countErr } = await supabaseClient
      .from("assistant_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sinceIso);

    if (countErr) {
      console.error("Rate limit count error", countErr);
    }

    if ((count ?? 0) >= limit) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Evidence analysis is limited to 10 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log request without IP
    supabaseClient.from("assistant_requests").insert({ user_id: user.id })
      .then(({ error }) => error && console.error("Log insert error", error));

    const { 
      file_id, 
      analysis_types = ['legal_relevance'],
      generate_connections = true 
    } = await req.json();

    if (!file_id) {
      return new Response(
        JSON.stringify({ error: 'file_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting evidence analysis for file: ${file_id}, types: ${analysis_types}`);

    // Get file and its chunks
    const { data: fileData, error: fileError } = await supabaseClient
      .from('files')
      .select(`
        id,
        name,
        status,
        chunks (
          id,
          text,
          seq,
          meta
        )
      `)
      .eq('id', file_id)
      .eq('user_id', user.id)
      .single();

    if (fileError || !fileData) {
      throw new Error(`File not found: ${fileError?.message}`);
    }

    if (!fileData.chunks || fileData.chunks.length === 0) {
      throw new Error('No text chunks found for analysis');
    }

    // Combine all text chunks
    const fullText = fileData.chunks
      .sort((a, b) => a.seq - b.seq)
      .map(chunk => chunk.text)
      .join('\n\n');

    console.log(`Analyzing ${fullText.length} characters of text`);

    // Perform different types of analysis
    const analysisResults = [];

    for (const analysisType of analysis_types) {
      try {
        const analysis = await performAnalysis(fullText, analysisType, fileData.name, openaiApiKey);
        
        // Store analysis in database
        const { error: insertError } = await supabaseClient
          .from('evidence_analysis')
          .insert({
            user_id: user.id,
            file_id: file_id,
            analysis_type: analysisType,
            content: analysis.content,
            legal_concepts: analysis.legal_concepts || [],
            confidence_score: analysis.confidence_score || 0.5,
            relevant_citations: analysis.relevant_citations || []
          });

        if (insertError) {
          console.error(`Failed to store ${analysisType} analysis:`, insertError);
        } else {
          analysisResults.push({
            type: analysisType,
            success: true,
            content: analysis.content
          });
        }
      } catch (error) {
        console.error(`Analysis failed for ${analysisType}:`, error);
        analysisResults.push({
          type: analysisType,
          success: false,
          error: error.message
        });
      }
    }

    // Generate legal connections if requested
    let connectionsCount = 0;
    if (generate_connections) {
      try {
        connectionsCount = await generateLegalConnections(
          user.id,
          file_id,
          fullText,
          fileData.name,
          supabaseClient,
          openaiApiKey
        );
        console.log(`Generated ${connectionsCount} legal connections`);
      } catch (error) {
        console.error('Failed to generate legal connections:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        file_id,
        file_name: fileData.name,
        analysis_results: analysisResults,
        connections_generated: connectionsCount,
        total_chunks: fileData.chunks.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Evidence analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Analysis failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function performAnalysis(text: string, analysisType: string, fileName: string, openaiApiKey: string) {
  const prompts = {
    legal_relevance: `Analyze this evidence document for legal relevance in NSW family law and domestic violence cases.

Document: ${fileName}
Content: ${text.substring(0, 4000)}

Provide analysis in this JSON format:
{
  "content": "Detailed analysis of legal relevance, key facts, and potential implications",
  "legal_concepts": ["concept1", "concept2", "concept3"],
  "confidence_score": 0.85,
  "relevant_citations": [
    {
      "type": "statute",
      "citation": "s 60CC Family Law Act 1975",
      "relevance": "explains how this evidence relates to best interests"
    }
  ]
}

Focus on:
1. What legal issues this evidence supports or contradicts
2. Key facts that would be relevant in court
3. How this relates to NSW/Commonwealth family law
4. Any patterns of behavior that match legal definitions`,

    case_strength: `Evaluate how this evidence impacts the strength of a legal case.

Document: ${fileName}
Content: ${text.substring(0, 4000)}

Provide evaluation in JSON format:
{
  "content": "Assessment of how this evidence strengthens or weakens potential legal claims",
  "legal_concepts": ["evidence strength", "admissibility", "relevance"],
  "confidence_score": 0.75,
  "relevant_citations": []
}

Consider:
1. Strength as evidence (strong, moderate, weak)
2. Admissibility concerns
3. Corroboration value
4. Potential weaknesses or challenges`,

    timeline_extraction: `Extract key timeline events from this evidence.

Document: ${fileName}  
Content: ${text.substring(0, 4000)}

Extract events in JSON format:
{
  "content": "Summary of timeline events and their legal significance",
  "legal_concepts": ["chronology", "pattern of behavior", "escalation"],
  "confidence_score": 0.9,
  "relevant_citations": []
}

Focus on:
1. Dates and times mentioned
2. Sequence of events
3. Patterns of escalation or change
4. Legal significance of timing`,

    pattern_detection: `Identify patterns of behavior that may be legally significant.

Document: ${fileName}
Content: ${text.substring(0, 4000)}

Analyze patterns in JSON format:
{
  "content": "Description of behavioral patterns and their legal implications",
  "legal_concepts": ["coercive control", "domestic violence", "parenting concerns"],
  "confidence_score": 0.8,
  "relevant_citations": [
    {
      "type": "statute", 
      "citation": "s 4AB Family Law Act 1975",
      "relevance": "definition of family violence includes this pattern"
    }
  ]
}

Look for:
1. Patterns of control or manipulation
2. Escalation over time
3. Impact on children or family
4. Behavior matching legal definitions`
  };

  const systemPrompt = prompts[analysisType] || prompts.legal_relevance;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a legal analyst specializing in NSW family law and domestic violence cases. Provide thorough, accurate analysis in the requested JSON format.'
        },
        {
          role: 'user',
          content: systemPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No analysis content returned');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Fallback if JSON parsing fails
    return {
      content: content,
      legal_concepts: [],
      confidence_score: 0.5,
      relevant_citations: []
    };
  }
}

async function generateLegalConnections(
  userId: string, 
  fileId: string, 
  text: string, 
  fileName: string,
  supabaseClient: any,
  openaiApiKey: string
): Promise<number> {
  // Get relevant legal sections
  const { data: legalSections, error: sectionsError } = await supabaseClient
    .from('legal_sections')
    .select(`
      id,
      title,
      content,
      citation_format,
      legal_documents!inner(
        scope,
        jurisdiction,
        user_id
      )
    `)
    .or('legal_documents.scope.eq.global,and(legal_documents.scope.eq.personal,legal_documents.user_id.eq.' + userId + ')')
    .eq('legal_documents.jurisdiction', 'NSW')
    .limit(20);

  if (sectionsError || !legalSections) {
    throw new Error('Failed to fetch legal sections');
  }

  console.log(`Found ${legalSections.length} legal sections to analyze for connections`);

  const connectionsGenerated = [];

  // Analyze connections in batches
  const batchSize = 5;
  for (let i = 0; i < legalSections.length; i += batchSize) {
    const batch = legalSections.slice(i, i + batchSize);
    
    const prompt = `Analyze connections between this evidence and legal provisions.

Evidence Document: ${fileName}
Evidence Content (first 2000 chars): ${text.substring(0, 2000)}

Legal Provisions:
${batch.map((section, idx) => 
  `${idx + 1}. ${section.title}\nCitation: ${section.citation_format || 'N/A'}\nContent: ${section.content.substring(0, 500)}...\n`
).join('\n')}

For each legal provision, determine if there's a meaningful connection to the evidence. Respond in JSON format:
{
  "connections": [
    {
      "section_id": "${batch[0].id}",
      "connection_type": "supports|contradicts|explains|precedent|requirement",
      "relevance_score": 0.85,
      "explanation": "Specific explanation of how the evidence relates to this legal provision"
    }
  ]
}

Only include connections with relevance_score > 0.6. Connection types:
- supports: Evidence supports this legal requirement/principle
- contradicts: Evidence conflicts with this provision
- explains: This law explains the evidence or provides context
- precedent: This case law is similar to the evidence situation
- requirement: This law creates obligations relevant to the evidence`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system', 
              content: 'You are a legal analyst specializing in connecting evidence to relevant laws. Be precise and only identify strong, meaningful connections.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 2000
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error for batch ${i}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (content) {
        try {
          const analysis = JSON.parse(content);
          if (analysis.connections && Array.isArray(analysis.connections)) {
            for (const connection of analysis.connections) {
              if (connection.relevance_score > 0.6) {
                // Insert connection into database
                const { error: insertError } = await supabaseClient
                  .from('evidence_legal_connections')
                  .insert({
                    user_id: userId,
                    evidence_file_id: fileId,
                    legal_section_id: connection.section_id,
                    connection_type: connection.connection_type,
                    relevance_score: connection.relevance_score,
                    explanation: connection.explanation
                  });

                if (!insertError) {
                  connectionsGenerated.push(connection);
                } else {
                  console.error('Failed to insert connection:', insertError);
                }
              }
            }
          }
        } catch (parseError) {
          console.error(`Failed to parse connections for batch ${i}:`, parseError);
        }
      }
    } catch (error) {
      console.error(`Error processing batch ${i}:`, error);
    }

    // Small delay between batches to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return connectionsGenerated.length;
}