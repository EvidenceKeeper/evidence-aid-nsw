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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      query, 
      searchType = 'both',
      jurisdiction = 'NSW',
      citationType,
      yearFrom,
      yearTo,
      court,
      includePersonal = false 
    } = await req.json();

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enhanced legal search request:', {
      query,
      searchType,
      jurisdiction,
      citationType,
      yearFrom,
      yearTo,
      court,
      includePersonal
    });

    // Get user for personal document filtering
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id;
    }

    // Build base query for legal sections with citations
    let sectionsQuery = supabaseClient
      .from('legal_sections')
      .select(`
        id,
        title,
        content,
        section_number,
        citation_format,
        source_url,
        paragraph_anchor,
        legal_concepts,
        legal_documents!inner(
          id,
          title,
          document_type,
          jurisdiction,
          scope,
          user_id
        ),
        legal_citations(
          id,
          citation_type,
          short_citation,
          full_citation,
          neutral_citation,
          court,
          year,
          jurisdiction,
          url,
          confidence_score
        )
      `);

    // Apply jurisdiction filter
    if (jurisdiction !== 'All') {
      sectionsQuery = sectionsQuery.eq('legal_documents.jurisdiction', jurisdiction);
    }

    // Apply scope filter for personal documents
    if (includePersonal && userId) {
      sectionsQuery = sectionsQuery.or(
        `legal_documents.scope.eq.global,and(legal_documents.scope.eq.personal,legal_documents.user_id.eq.${userId})`
      );
    } else {
      sectionsQuery = sectionsQuery.eq('legal_documents.scope', 'global');
    }

    // Apply citation type filter
    if (citationType) {
      sectionsQuery = sectionsQuery.eq('legal_documents.document_type', citationType);
    }

    let searchResults = [];

    if (searchType === 'semantic' || searchType === 'both') {
      // Get OpenAI API key for embeddings
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      try {
        // Generate embedding for the query
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
          throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // Perform semantic search using pgvector
        const { data: semanticResults, error: semanticError } = await supabaseClient
          .rpc('match_legal_sections', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 20
          });

        if (semanticError) {
          console.error('Semantic search error:', semanticError);
        } else if (semanticResults) {
          searchResults = [...searchResults, ...semanticResults];
        }
      } catch (error) {
        console.error('Semantic search failed:', error);
        // Continue with keyword search only
      }
    }

    if (searchType === 'keyword' || searchType === 'both') {
      // Perform text search
      const { data: keywordResults, error: keywordError } = await sectionsQuery
        .textSearch('tsv', query, {
          type: 'websearch',
          config: 'english'
        })
        .limit(20);

      if (keywordError) {
        console.error('Keyword search error:', keywordError);
      } else if (keywordResults) {
        searchResults = [...searchResults, ...keywordResults];
      }
    }

    // If no results from either method, try fallback search
    if (searchResults.length === 0) {
      const { data: fallbackResults, error: fallbackError } = await sectionsQuery
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);

      if (!fallbackError && fallbackResults) {
        searchResults = fallbackResults;
      }
    }

    // Remove duplicates and enhance results
    const uniqueResults = Array.from(
      new Map(searchResults.map(item => [item.id, item])).values()
    );

    // Apply additional filters
    let filteredResults = uniqueResults;

    // Filter by year if citations exist
    if (yearFrom || yearTo) {
      filteredResults = filteredResults.filter(result => {
        if (!result.legal_citations || result.legal_citations.length === 0) return true;
        
        return result.legal_citations.some(citation => {
          if (!citation.year) return true;
          const year = citation.year;
          if (yearFrom && year < parseInt(yearFrom)) return false;
          if (yearTo && year > parseInt(yearTo)) return false;
          return true;
        });
      });
    }

    // Filter by court
    if (court) {
      filteredResults = filteredResults.filter(result => {
        if (!result.legal_citations || result.legal_citations.length === 0) return true;
        
        return result.legal_citations.some(citation => 
          citation.court?.toLowerCase().includes(court.toLowerCase())
        );
      });
    }

    // Calculate relevance scores and format results
    const formattedResults = filteredResults.map(result => {
      // Calculate relevance based on query match
      const titleMatch = result.title?.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
      const contentMatch = result.content?.toLowerCase().includes(query.toLowerCase()) ? 0.2 : 0;
      const conceptMatch = result.legal_concepts?.some(concept => 
        concept.toLowerCase().includes(query.toLowerCase())
      ) ? 0.3 : 0;
      
      const relevanceScore = Math.min(0.2 + titleMatch + contentMatch + conceptMatch, 1.0);

      return {
        id: result.id,
        title: result.title || 'Untitled Section',
        content: result.content?.substring(0, 300) + (result.content?.length > 300 ? '...' : ''),
        section_id: result.id,
        document_id: result.legal_documents?.id,
        document_type: result.legal_documents?.document_type || 'unknown',
        jurisdiction: result.legal_documents?.jurisdiction || jurisdiction,
        section_number: result.section_number,
        citation_format: result.citation_format,
        source_url: result.source_url,
        paragraph_anchor: result.paragraph_anchor,
        legal_concepts: result.legal_concepts || [],
        citations: result.legal_citations || [],
        relevance_score: relevanceScore,
      };
    });

    // Sort by relevance score
    const sortedResults = formattedResults
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 25); // Limit final results

    console.log(`Enhanced legal search completed: ${sortedResults.length} results`);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        total: sortedResults.length,
        filters: {
          searchType,
          jurisdiction,
          citationType,
          yearFrom,
          yearTo,
          court,
          includePersonal
        },
        results: sortedResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Enhanced legal search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Search failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});