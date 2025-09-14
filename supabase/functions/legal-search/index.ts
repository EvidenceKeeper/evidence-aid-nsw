import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { query, searchType = 'hybrid', jurisdiction = 'NSW' } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Legal search initiated: "${query}" (${searchType}, ${jurisdiction})`);

    // Check cache first
    const queryHash = btoa(query + searchType + jurisdiction).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    const { data: cached } = await supabase
      .from('legal_search_cache')
      .select('results, hit_count')
      .eq('query_hash', queryHash)
      .single();

    if (cached) {
      console.log('📋 Returning cached results');
      // Update hit count
      await supabase
        .from('legal_search_cache')
        .update({ hit_count: cached.hit_count + 1, last_accessed: new Date().toISOString() })
        .eq('query_hash', queryHash);

      return new Response(JSON.stringify({
        results: cached.results,
        cached: true,
        searchType,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let searchResults: any[] = [];

    if (searchType === 'keyword' || searchType === 'hybrid') {
      // Keyword search using PostgreSQL full-text search
      console.log('🔤 Performing keyword search...');
      const { data: keywordResults, error: keywordError } = await supabase
        .from('legal_sections')
        .select(`
          id, section_number, title, content, citation_reference, 
          legal_concepts, section_type, level,
          legal_documents!inner(title, document_type, jurisdiction)
        `)
        .textSearch('tsv', query, {
          type: 'websearch',
          config: 'english'
        })
        .eq('legal_documents.jurisdiction', jurisdiction)
        .limit(10);

      if (keywordError) {
        console.error('Keyword search error:', keywordError);
      } else {
        searchResults = keywordResults || [];
      }
    }

    if (searchType === 'semantic' || searchType === 'hybrid') {
      console.log('🧠 Performing semantic search...');
      
      try {
        // Generate embedding for the query
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: query,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;

          // For now, we'll use a semantic concept match since we don't have pgvector
          // This searches based on legal concepts that are semantically related
          const conceptKeywords = query.toLowerCase().split(/\s+/)
            .filter(word => word.length > 2)
            .map(word => `%${word}%`);

          const { data: semanticResults, error: semanticError } = await supabase
            .from('legal_sections')
            .select(`
              id, section_number, title, content, citation_reference,
              legal_concepts, section_type, level,
              legal_documents!inner(title, document_type, jurisdiction)
            `)
            .or(conceptKeywords.map(keyword => `legal_concepts.cs.{${keyword}}`).join(','))
            .eq('legal_documents.jurisdiction', jurisdiction)
            .limit(10);

          if (semanticError) {
            console.error('Semantic search error:', semanticError);
          } else if (semanticResults) {
            // Merge with keyword results and deduplicate
            const existingIds = new Set(searchResults.map(r => r.id));
            const newSemanticResults = semanticResults.filter(r => !existingIds.has(r.id));
            searchResults = [...searchResults, ...newSemanticResults];
          }
        }
      } catch (semanticError) {
        console.error('Semantic search failed:', semanticError);
      }
    }

    // Enhance results with relevance scoring and legal analysis
    const enhancedResults = await Promise.all(
      searchResults.slice(0, 8).map(async (result, index) => {
        const relevanceScore = 1.0 - (index * 0.1); // Simple relevance scoring
        
        return {
          id: result.id,
          section_number: result.section_number,
          title: result.title,
          content: result.content.substring(0, 500) + '...',
          full_content: result.content,
          citation_reference: result.citation_reference,
          legal_concepts: result.legal_concepts,
          section_type: result.section_type,
          level: result.level,
          document: result.legal_documents,
          relevance_score: relevanceScore,
          search_type: searchType,
        };
      })
    );

    // Cache the results
    await supabase.from('legal_search_cache').insert({
      query_hash: queryHash,
      query_text: query,
      search_type: searchType,
      results: enhancedResults,
    });

    console.log(`✅ Legal search completed: ${enhancedResults.length} results found`);

    return new Response(JSON.stringify({
      results: enhancedResults,
      cached: false,
      searchType,
      totalResults: enhancedResults.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal-search:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});