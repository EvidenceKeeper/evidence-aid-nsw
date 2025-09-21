import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SearchResult {
  evidence_id: string;
  file_name: string;
  excerpt: string;
  relevance_score: number;
  concepts_matched: string[];
  legal_significance?: string;
  category: string;
  created_at: string;
  highlighted_text: string;
}

interface SearchResponse {
  query: string;
  steps: string[];
  results: SearchResult[];
  total_found: number;
  search_time_ms: number;
}

// Legal concept mappings for better search understanding
const LEGAL_CONCEPT_MAPPINGS = {
  'coercion': ['threats', 'pressure', 'manipulation', 'intimidation', 'force', 'control'],
  'stalking': ['harassment', 'following', 'surveillance', 'watching', 'tracking', 'monitoring'],
  'violence': ['assault', 'battery', 'physical harm', 'hitting', 'pushing', 'aggression', 'abuse'],
  'child safety': ['children present', 'in front of kids', 'child welfare', 'custody', 'parenting'],
  'financial control': ['money', 'finances', 'economic abuse', 'financial withholding', 'bank accounts'],
  'emotional abuse': ['manipulation', 'gaslighting', 'humiliation', 'degradation', 'psychological'],
  'communication': ['messages', 'texts', 'emails', 'calls', 'social media', 'contact']
};

async function expandQueryConcepts(query: string): Promise<{ expandedTerms: string[]; concepts: string[] }> {
  const normalizedQuery = query.toLowerCase();
  let expandedTerms = [query];
  let matchedConcepts: string[] = [];

  // Check for direct concept matches
  for (const [concept, synonyms] of Object.entries(LEGAL_CONCEPT_MAPPINGS)) {
    if (normalizedQuery.includes(concept) || synonyms.some(syn => normalizedQuery.includes(syn))) {
      expandedTerms.push(...synonyms);
      matchedConcepts.push(concept);
    }
  }

  // Use AI to understand complex queries if OpenAI is available
  if (openAIApiKey && query.length > 10) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a legal evidence search expert. Extract key concepts and suggest related legal terms. Return ONLY a valid JSON object with exactly this structure:
              {"concepts": ["concept1"], "synonyms": ["term1"], "behavioral_indicators": ["pattern1"]}
              
              Do not use markdown formatting or explanatory text.`
            },
            {
              role: 'user',
              content: `Extract legal concepts and synonyms for: "${query}"`
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0]?.message?.content;
        
        if (content) {
          // Clean any markdown formatting
          content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
          
          // Extract JSON if wrapped in other text
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            content = jsonMatch[0];
          }
          
          try {
            const analysis = JSON.parse(content);
            if (analysis.synonyms && Array.isArray(analysis.synonyms)) {
              expandedTerms.push(...analysis.synonyms);
            }
            if (analysis.concepts && Array.isArray(analysis.concepts)) {
              matchedConcepts.push(...analysis.concepts);
            }
            if (analysis.behavioral_indicators && Array.isArray(analysis.behavioral_indicators)) {
              expandedTerms.push(...analysis.behavioral_indicators);
            }
          } catch (parseError) {
            console.log('Failed to parse AI response JSON:', parseError);
          }
        }
      }
    } catch (error) {
      console.log('AI query expansion failed, using rule-based expansion:', error);
    }
  }

  return {
    expandedTerms: [...new Set(expandedTerms)],
    concepts: [...new Set(matchedConcepts)]
  };
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openAIApiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data[0].embedding;
    }
  } catch (error) {
    console.log('Embedding generation failed:', error);
  }
  return null;
}

async function searchEvidence(
  userId: string,
  query: string,
  expandedTerms: string[],
  concepts: string[],
  maxResults: number = 20,
  minRelevance: number = 0.3
): Promise<{ results: any[]; totalFound: number }> {
  const searchSteps: string[] = [];
  let allResults: any[] = [];

  // 1. Vector similarity search (if we have embeddings)
  const queryEmbedding = await generateEmbedding(query);
  if (queryEmbedding) {
    searchSteps.push("Performing semantic vector search using AI embeddings");
    
    const { data: vectorResults } = await supabase.rpc('match_user_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: minRelevance,
      match_count: maxResults,
      filter_user_id: userId
    });

    if (vectorResults) {
      allResults.push(...vectorResults.map((r: any) => ({
        ...r,
        search_type: 'vector',
        score: r.similarity
      })));
    }
  }

  // 2. Full-text search using tsv
  searchSteps.push("Performing full-text search across evidence content");
  
  const tsQueryString = expandedTerms
    .map(term => term.replace(/[^\w\s]/g, '').trim())
    .filter(term => term.length > 2)
    .join(' | ');

  if (tsQueryString) {
    const { data: textResults } = await supabase
      .from('chunks')
      .select(`
        id,
        file_id,
        text,
        meta,
        files!inner (
          id,
          name,
          category,
          user_id,
          created_at
        )
      `)
      .eq('files.user_id', userId)
      .textSearch('tsv', tsQueryString, {
        type: 'websearch',
        config: 'english'
      })
      .limit(maxResults);

    if (textResults) {
      allResults.push(...textResults.map((r: any) => ({
        id: r.id,
        file_id: r.file_id,
        text: r.text,
        meta: r.meta,
        file_name: r.files.name,
        search_type: 'fulltext',
        score: 0.7, // Default relevance for text search
        created_at: r.files.created_at
      })));
    }
  }

  // 3. Enhanced analysis search (look in comprehensive analysis)
  searchSteps.push("Searching comprehensive evidence analysis for pattern matches");
  
  const { data: analysisResults } = await supabase
    .from('evidence_comprehensive_analysis')
    .select(`
      id,
      file_id,
      key_insights,
      case_impact,
      strategic_recommendations,
      timeline_significance,
      legal_strength,
      confidence_score,
      files!inner (
        id,
        name,
        category,
        user_id,
        created_at
      )
    `)
    .eq('user_id', userId)
    .or(
      expandedTerms.map(term => 
        `key_insights.ilike.%${term}%,case_impact.ilike.%${term}%,strategic_recommendations.cs.{${term}},timeline_significance.ilike.%${term}%`
      ).join(',')
    )
    .limit(maxResults);

  if (analysisResults) {
    allResults.push(...analysisResults.map((r: any) => ({
      id: r.id,
      file_id: r.file_id,
      text: r.case_impact || r.timeline_significance || 'Analysis insights available',
      meta: { 
        legal_strength: r.legal_strength,
        confidence: r.confidence_score,
        insights: r.key_insights
      },
      file_name: r.files.name,
      search_type: 'analysis',
      score: Math.min(0.9, (r.legal_strength || 5) / 10 + 0.1),
      created_at: r.files.created_at,
      legal_significance: r.case_impact
    })));
  }

  // 4. Remove duplicates and sort by relevance
  const uniqueResults = allResults.reduce((acc, current) => {
    const existingIndex = acc.findIndex(item => 
      item.file_id === current.file_id && 
      item.text.substring(0, 100) === current.text.substring(0, 100)
    );
    
    if (existingIndex === -1) {
      acc.push(current);
    } else if (current.score > acc[existingIndex].score) {
      acc[existingIndex] = current;
    }
    return acc;
  }, [] as any[]);

  const sortedResults = uniqueResults
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return {
    results: sortedResults,
    totalFound: uniqueResults.length
  };
}

function highlightSearchTerms(text: string, searchTerms: string[]): string {
  let highlightedText = text;
  
  for (const term of searchTerms) {
    if (term.length < 3) continue;
    
    const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    highlightedText = highlightedText.replace(regex, '**[highlight]$1**[/highlight]');
  }
  
  return highlightedText;
}

function extractContextualExcerpt(text: string, searchTerms: string[], maxLength: number = 300): string {
  // Find the first occurrence of any search term
  const firstMatchIndex = Math.min(
    ...searchTerms
      .map(term => text.toLowerCase().indexOf(term.toLowerCase()))
      .filter(index => index >= 0)
  );

  if (firstMatchIndex === -1) {
    return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Extract context around the match
  const start = Math.max(0, firstMatchIndex - 100);
  const end = Math.min(text.length, firstMatchIndex + maxLength - 100);
  
  let excerpt = text.substring(start, end);
  
  // Clean up the excerpt boundaries
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  
  return excerpt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      throw new Error('Authentication failed - no authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Attempting authentication with token length:', token.length);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.log('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      console.log('No user found from token');
      throw new Error('Authentication failed - no user found');
    }

    console.log('User authenticated successfully:', user.id);

    const { 
      query, 
      include_analysis = true, 
      max_results = 20, 
      min_relevance = 0.3 
    } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }

    const searchSteps: string[] = [];
    
    // Step 1: Analyze and expand the query
    searchSteps.push(`Analyzing search query: "${query}"`);
    const { expandedTerms, concepts } = await expandQueryConcepts(query);
    searchSteps.push(`Expanded to ${expandedTerms.length} search terms and identified ${concepts.length} legal concepts`);

    // Step 2: Search across evidence
    const { results: rawResults, totalFound } = await searchEvidence(
      user.id,
      query,
      expandedTerms,
      concepts,
      max_results,
      min_relevance
    );

    searchSteps.push(`Found ${totalFound} relevant evidence pieces across multiple search methods`);

    // Step 3: Process and format results
    const processedResults: SearchResult[] = rawResults.map(result => {
      const contextualExcerpt = extractContextualExcerpt(result.text, expandedTerms);
      const highlightedText = highlightSearchTerms(contextualExcerpt, expandedTerms);
      
      return {
        evidence_id: result.file_id,
        file_name: result.file_name,
        excerpt: contextualExcerpt,
        relevance_score: result.score,
        concepts_matched: concepts.filter(concept => 
          expandedTerms.some(term => 
            result.text.toLowerCase().includes(term.toLowerCase())
          )
        ),
        legal_significance: result.legal_significance,
        category: result.meta?.category || 'evidence',
        created_at: result.created_at,
        highlighted_text: highlightedText
      };
    });

    searchSteps.push(`Processed results with contextual highlighting and legal significance analysis`);

    const endTime = Date.now();
    const response: SearchResponse = {
      query,
      steps: searchSteps,
      results: processedResults,
      total_found: totalFound,
      search_time_ms: endTime - startTime
    };

    console.log(`Search completed: "${query}" -> ${totalFound} results in ${endTime - startTime}ms`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Enterprise search error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      query: '',
      steps: [`Error: ${error.message}`],
      results: [],
      total_found: 0,
      search_time_ms: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});