import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RAGRequest {
  query: string;
  includeEvidence?: boolean;
  mode?: 'user' | 'lawyer';
  jurisdiction?: string;
  maxResults?: number;
  citationMode?: boolean;
}

interface Citation {
  id: string;
  citation_type: string;
  short_citation: string;
  full_citation: string;
  neutral_citation?: string;
  court?: string;
  year?: number;
  jurisdiction: string;
  url?: string;
  confidence_score: number;
  content_preview?: string;
}

interface RAGResponse {
  answer: string;
  citations: Citation[];
  evidence_connections: any[];
  confidence_score: number;
  source_freshness: number;
  citation_hit_rate: number;
  mode: 'user' | 'lawyer';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get user authentication
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id;
    }

    const { 
      query, 
      includeEvidence = false, 
      mode = 'user',
      jurisdiction = 'NSW',
      maxResults = 10,
      citationMode = false 
    }: RAGRequest = await req.json();

    console.log('NSW RAG Assistant request:', { query, includeEvidence, mode, jurisdiction });

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Determine intent and extract legal concepts
    const intentAnalysis = await analyzeIntent(query, openaiApiKey);
    
    // Step 2: Retrieve legal context (dual retrieval)
    const [legalContext, evidenceContext] = await Promise.all([
      retrieveLegalContext(query, jurisdiction, supabaseClient, openaiApiKey),
      includeEvidence && userId ? 
        retrieveEvidenceContext(query, userId, supabaseClient) : 
        Promise.resolve([])
    ]);

    // Step 3: Generate grounded response
    const response = await generateGroundedResponse(
      query, 
      legalContext, 
      evidenceContext, 
      intentAnalysis,
      mode,
      citationMode,
      openaiApiKey
    );

    // Step 4: Track quality metrics
    if (userId) {
      await trackResponseQuality(
        userId, 
        query, 
        response, 
        supabaseClient
      );
    }

    console.log('NSW RAG response generated successfully');

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('NSW RAG Assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'RAG processing failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function analyzeIntent(query: string, openaiApiKey: string) {
  const intentPrompt = `Analyze this NSW legal query and identify:
1. Intent type (statute_lookup, case_principle, procedure, form, deadline, police_process, evidence_analysis)
2. Key legal concepts (e.g., AVO, parenting orders, coercive control, best interests)
3. Required citation types (statute, case_law, practice_direction, regulation)
4. NSW jurisdiction specifics (which courts, acts, procedures)

Query: "${query}"

Respond in JSON format with: intent_type, legal_concepts[], citation_types[], nsw_specific_elements[]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a NSW legal expert analyzing queries for intent and required legal sources.' },
          { role: 'user', content: intentPrompt }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Intent analysis failed:', error);
    return {
      intent_type: 'general',
      legal_concepts: [],
      citation_types: ['statute', 'case_law'],
      nsw_specific_elements: []
    };
  }
}

async function retrieveLegalContext(
  query: string, 
  jurisdiction: string, 
  supabaseClient: any, 
  openaiApiKey: string
) {
  try {
    // Generate embedding for semantic search
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Try semantic search on legal sections first
    const { data: semanticResults, error: semanticError } = await supabaseClient
      .rpc('match_legal_sections', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 15
      });

    let results = semanticResults || [];

    // Fallback to enhanced legal search if no semantic results
    if (results.length === 0) {
      const { data: fallbackResults } = await supabaseClient.functions.invoke('enhanced-legal-search', {
        body: {
          query,
          searchType: 'both',
          jurisdiction,
          maxResults: 15
        }
      });
      
      results = fallbackResults?.results || [];
    }

    // Enhance with citations and metadata
    const enhancedResults = await Promise.all(
      results.slice(0, 10).map(async (result: any) => {
        const { data: citations } = await supabaseClient
          .from('legal_citations')
          .select('*')
          .eq('section_id', result.id);

        return {
          ...result,
          citations: citations || [],
          provenance: {
            retrieved_at: new Date().toISOString(),
            search_method: 'semantic',
            confidence: result.similarity || result.relevance_score || 0.8
          }
        };
      })
    );

    return enhancedResults;
  } catch (error) {
    console.error('Legal context retrieval failed:', error);
    return [];
  }
}

async function retrieveEvidenceContext(query: string, userId: string, supabaseClient: any) {
  try {
    const { data, error } = await supabaseClient
      .rpc('get_evidence_informed_advice', {
        _user_id: userId,
        _query: query,
        _include_evidence: true
      })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Evidence context retrieval failed:', error);
    return [];
  }
}

async function generateGroundedResponse(
  query: string,
  legalContext: any[],
  evidenceContext: any[],
  intentAnalysis: any,
  mode: 'user' | 'lawyer',
  citationMode: boolean,
  openaiApiKey: string
): Promise<RAGResponse> {
  
  const systemPrompt = mode === 'lawyer' ? 
    getLawyerSystemPrompt() : 
    getUserSystemPrompt();

  const contextPrompt = buildContextPrompt(query, legalContext, evidenceContext, intentAnalysis, mode);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contextPrompt }
        ],
        max_completion_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`Response generation failed: ${response.status}`);
    }

    const data = await response.json();
    const rawAnswer = data.choices[0].message.content;

    // Extract citations and calculate metrics
    const citations = extractCitations(legalContext);
    const citationHitRate = calculateCitationHitRate(rawAnswer, citations);
    const sourceFreshness = calculateSourceFreshness(legalContext);
    const confidenceScore = calculateConfidenceScore(legalContext, evidenceContext);

    return {
      answer: rawAnswer,
      citations,
      evidence_connections: evidenceContext,
      confidence_score: confidenceScore,
      source_freshness: sourceFreshness,
      citation_hit_rate: citationHitRate,
      mode
    };
  } catch (error) {
    console.error('Response generation failed:', error);
    throw error;
  }
}

function getLawyerSystemPrompt(): string {
  return `You are a NSW legal expert providing detailed legal analysis with precise citations.

CRITICAL REQUIREMENTS:
- EVERY legal claim MUST include specific citations (Act s X, Case [YYYY] Court para Y)
- Use neutral, technical language appropriate for legal practitioners
- Include exact statutory references and case paragraph numbers
- Distinguish between binding precedent and persuasive authority
- Note any conflicting authorities or legal uncertainties
- Provide comprehensive legal basis for all conclusions

FORMAT:
- Lead with specific legal principles and authorities
- Use pinpoint citations: "s 60CC(2)(a) Family Law Act 1975 (Cth)"
- Reference case law: "Doe v Smith [2023] FCFCOA 123 at [45]"
- Note jurisdiction-specific requirements
- Include procedural steps and deadlines where relevant

NEVER speculate beyond available sources. Flag gaps in legal authority.`;
}

function getUserSystemPrompt(): string {
  return `You are a friendly NSW legal assistant helping people understand their rights in plain English.

APPROACH:
- Explain legal concepts in everyday language
- Use "you" and conversational tone
- Break down complex procedures into simple steps
- Focus on practical next steps and outcomes
- Include relevant deadlines and requirements

STRUCTURE:
- Start with a clear, direct answer
- Explain "what this means for you"
- List practical next steps
- Mention important deadlines or requirements
- Point to relevant forms or contacts when helpful

IMPORTANT:
- Never provide legal advice - only legal information
- Suggest consulting a lawyer for specific advice
- Always base answers on current NSW law
- Include relevant citations when users ask for legal basis`;
}

function buildContextPrompt(
  query: string,
  legalContext: any[],
  evidenceContext: any[],
  intentAnalysis: any,
  mode: string
): string {
  let prompt = `Query: "${query}"\n\n`;
  
  if (intentAnalysis.intent_type) {
    prompt += `Intent Analysis: ${intentAnalysis.intent_type}\n`;
    prompt += `Legal Concepts: ${intentAnalysis.legal_concepts.join(', ')}\n\n`;
  }

  prompt += "LEGAL SOURCES:\n";
  legalContext.forEach((source, idx) => {
    prompt += `[${idx + 1}] ${source.title}\n`;
    prompt += `Content: ${source.content}\n`;
    if (source.citations?.length > 0) {
      prompt += `Citations: ${source.citations.map((c: any) => c.short_citation).join(', ')}\n`;
    }
    prompt += `Source: ${source.source_url || 'Database'}\n\n`;
  });

  if (evidenceContext.length > 0) {
    prompt += "USER'S EVIDENCE CONNECTIONS:\n";
    evidenceContext.forEach((evidence, idx) => {
      prompt += `[E${idx + 1}] File: ${evidence.file_name}\n`;
      prompt += `Connection: ${evidence.connection_explanation}\n`;
      prompt += `Relevance: ${Math.round(evidence.evidence_relevance * 100)}%\n\n`;
    });
    prompt += "Consider how the legal principles apply to the user's specific evidence.\n\n";
  }

  prompt += mode === 'lawyer' ? 
    "Provide comprehensive legal analysis with precise citations." :
    "Provide a clear, practical answer in plain English.";

  return prompt;
}

function extractCitations(legalContext: any[]): Citation[] {
  const citations: Citation[] = [];
  
  legalContext.forEach(source => {
    if (source.citations) {
      citations.push(...source.citations.map((citation: any) => ({
        ...citation,
        content_preview: source.content?.substring(0, 150) + '...'
      })));
    }
  });

  return citations;
}

function calculateCitationHitRate(answer: string, citations: Citation[]): number {
  const legalClaims = (answer.match(/\b(must|shall|requires?|under|pursuant to|according to)\b/gi) || []).length;
  const citationReferences = citations.filter(c => 
    answer.includes(c.short_citation) || answer.includes(c.full_citation)
  ).length;
  
  return legalClaims > 0 ? citationReferences / legalClaims : 1.0;
}

function calculateSourceFreshness(legalContext: any[]): number {
  const now = new Date();
  const sourceDates = legalContext
    .map(source => source.last_verified || source.created_at)
    .filter(date => date)
    .map(date => Math.abs(now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  
  return sourceDates.length > 0 ? 
    sourceDates.reduce((sum, days) => sum + days, 0) / sourceDates.length : 
    30; // Default 30 days if no dates
}

function calculateConfidenceScore(legalContext: any[], evidenceContext: any[]): number {
  const legalScore = legalContext.length > 0 ? 
    legalContext.reduce((sum, source) => sum + (source.similarity || source.relevance_score || 0.5), 0) / legalContext.length :
    0.5;
    
  const evidenceBonus = evidenceContext.length > 0 ? 0.1 : 0;
  
  return Math.min(legalScore + evidenceBonus, 1.0);
}

async function trackResponseQuality(
  userId: string,
  query: string,
  response: RAGResponse,
  supabaseClient: any
) {
  try {
    await supabaseClient
      .from('rag_response_quality')
      .insert({
        user_id: userId,
        query_text: query,
        response_content: response.answer,
        citations_provided: response.citations,
        citation_hit_rate: response.citation_hit_rate,
        source_freshness: response.source_freshness,
        confidence_score: response.confidence_score,
        metadata: {
          mode: response.mode,
          evidence_connections_count: response.evidence_connections.length,
          generated_at: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Failed to track response quality:', error);
  }
}