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
  // Navigation data for click-to-evidence functionality
  chunk_id?: string;
  chunk_sequence?: number;
  navigation_url?: string;
}

interface SearchResponse {
  query: string;
  steps: string[];
  results: SearchResult[];
  total_found: number;
  search_time_ms: number;
}

// Comprehensive legal concept mappings for domestic violence and family law
const LEGAL_CONCEPT_MAPPINGS = {
  // STALKING & SURVEILLANCE BEHAVIORS
  'stalking': [
    'harassment', 'following', 'surveillance', 'watching', 'tracking', 'monitoring',
    'shows up', 'appears at', 'waiting for', 'lurking', 'observing', 'spying',
    'unexpected visits', 'unwanted presence', 'following me', 'watching me',
    'keeps appearing', 'always there', 'shows up everywhere', 'won\'t leave me alone'
  ],
  
  // PHYSICAL VIOLENCE & THREATS
  'violence': [
    'assault', 'battery', 'physical harm', 'hitting', 'pushing', 'aggression', 'abuse',
    'slapping', 'punching', 'kicking', 'choking', 'strangling', 'grabbing',
    'shaking', 'throwing', 'restraining', 'blocking', 'cornering', 'trapping',
    'physical force', 'bodily harm', 'injuries', 'bruises', 'marks'
  ],
  
  // THREATS & INTIMIDATION
  'threats': [
    'intimidation', 'threatening', 'menacing', 'scaring', 'frightening',
    'will hurt', 'going to', 'warned me', 'promised to', 'threatened to',
    'said he would', 'made threats', 'warning', 'promise', 'swore he would'
  ],
  
  // EMOTIONAL & PSYCHOLOGICAL ABUSE
  'emotional_abuse': [
    'manipulation', 'gaslighting', 'humiliation', 'degradation', 'psychological',
    'makes me feel', 'told me I\'m', 'says I\'m', 'calling me names', 'put down',
    'worthless', 'crazy', 'stupid', 'nothing', 'useless', 'pathetic',
    'makes me doubt', 'questioning myself', 'feel like I\'m losing my mind'
  ],
  
  // CONTROL & COERCION
  'control': [
    'coercion', 'controlling', 'dominating', 'power', 'authority', 'command',
    'won\'t let me', 'doesn\'t allow', 'forbids', 'prevents me', 'stops me',
    'makes me', 'forces me', 'has to approve', 'permission', 'decides for me',
    'tells me what', 'controls what', 'monitors my', 'checks my'
  ],
  
  // FINANCIAL ABUSE
  'financial_abuse': [
    'money', 'finances', 'economic abuse', 'financial withholding', 'bank accounts',
    'controls money', 'won\'t give money', 'takes my pay', 'hides money',
    'spending', 'budget', 'allowance', 'credit cards', 'bills', 'expenses',
    'financially dependent', 'can\'t afford', 'no access to money'
  ],
  
  // ISOLATION TACTICS
  'isolation': [
    'isolating', 'separating', 'cutting off', 'keeping away', 'preventing contact',
    'won\'t let me see', 'stops me from', 'doesn\'t want me to', 'jealous of',
    'friends', 'family', 'support', 'social', 'alone', 'lonely', 'cut off'
  ],
  
  // COMMUNICATION HARASSMENT
  'communication_harassment': [
    'messages', 'texts', 'emails', 'calls', 'social media', 'contact',
    'won\'t stop calling', 'keeps texting', 'constant messages', 'blowing up my phone',
    'multiple calls', 'non-stop', 'repeatedly', 'continuously', 'all the time',
    'every day', 'every hour', 'dozens of', 'hundreds of'
  ],
  
  // CHILD-RELATED ABUSE
  'child_safety': [
    'children present', 'in front of kids', 'child welfare', 'custody', 'parenting',
    'kids saw', 'children witnessed', 'scared the kids', 'using children',
    'threatens kids', 'involving children', 'parental rights', 'visitation',
    'school pickup', 'daycare', 'babysitter'
  ],
  
  // SEXUAL ABUSE
  'sexual_abuse': [
    'sexual assault', 'rape', 'forced sex', 'unwanted touching', 'sexual coercion',
    'made me', 'forced to', 'wouldn\'t take no', 'sexual demands', 'intimate images',
    'sharing photos', 'recording', 'sexual threats'
  ],
  
  // SUBSTANCE ABUSE
  'substance_abuse': [
    'drinking', 'alcohol', 'drugs', 'drunk', 'high', 'intoxicated',
    'addiction', 'substance', 'pills', 'medication', 'under the influence'
  ],
  
  // PROPERTY DAMAGE
  'property_damage': [
    'broke my', 'destroyed', 'damaged', 'threw', 'smashed', 'ruined',
    'vandalized', 'keyed', 'slashed tires', 'broken windows', 'holes in wall'
  ],
  
  // PATTERN INDICATORS (behavioral descriptions)
  'escalation_patterns': [
    'getting worse', 'more frequent', 'escalating', 'increasing', 'intensifying',
    'used to be', 'never did before', 'started doing', 'now he', 'recently began',
    'more aggressive', 'more violent', 'more controlling', 'worse than before'
  ],
  
  // TIME & FREQUENCY PATTERNS
  'frequency_patterns': [
    'always', 'constantly', 'continuously', 'repeatedly', 'every day', 'daily',
    'multiple times', 'non-stop', 'all the time', 'keeps doing', 'won\'t stop',
    'again and again', 'over and over', 'never stops'
  ]
};

// Behavioral pattern recognition for domestic violence contexts
const BEHAVIORAL_PATTERNS = {
  stalking_behaviors: [
    /shows? up (at|to) (my )?work/i,
    /waiting (for me )?at (my )?car/i,
    /follows? me (to|from|around)/i,
    /always seems? to be there/i,
    /appears? everywhere I go/i,
    /won'?t leave me alone/i,
    /keeps? (showing up|appearing)/i
  ],
  
  control_behaviors: [
    /won'?t let me (go|see|talk|leave)/i,
    /has to know where I am/i,
    /checks? my phone/i,
    /controls? (my|the) money/i,
    /decides? what I (wear|do|say)/i,
    /makes? me ask permission/i,
    /tells? me what to do/i
  ],
  
  threat_behaviors: [
    /said he would (hurt|kill|harm)/i,
    /threatened to (leave|take|hurt)/i,
    /warned me (about|that)/i,
    /promised he would/i,
    /if I (leave|tell|call)/i,
    /swore he would/i
  ],
  
  escalation_indicators: [
    /getting (worse|more|angrier)/i,
    /(more|increasingly) (violent|aggressive|controlling)/i,
    /never did this before/i,
    /started (doing|saying|threatening)/i,
    /escalat(ing|ed)/i,
    /worse than (before|usual)/i
  ],
  
  emotional_abuse_patterns: [
    /makes? me feel (like|so|really) (crazy|stupid|worthless)/i,
    /tells? me I'?m (nothing|worthless|crazy|stupid)/i,
    /says? (nobody|no one) will (believe|want) me/i,
    /makes? me doubt myself/i,
    /questioning my (sanity|memory|judgment)/i,
    /feel like I'?m losing my mind/i
  ]
};

// Fuzzy matching helpers
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function isFuzzyMatch(term1: string, term2: string, threshold: number = 0.8): boolean {
  if (term1.length < 3 || term2.length < 3) return false;
  const distance = calculateLevenshteinDistance(term1.toLowerCase(), term2.toLowerCase());
  const maxLength = Math.max(term1.length, term2.length);
  const similarity = 1 - (distance / maxLength);
  return similarity >= threshold;
}

async function expandQueryConcepts(query: string): Promise<{ expandedTerms: string[]; concepts: string[] }> {
  const normalizedQuery = query.toLowerCase();
  let expandedTerms = [query];
  let matchedConcepts: string[] = [];

  // 1. BEHAVIORAL PATTERN RECOGNITION - Check for behavioral descriptions
  for (const [behaviorType, patterns] of Object.entries(BEHAVIORAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        matchedConcepts.push(behaviorType);
        // Add related legal terms based on behavior type
        if (behaviorType.includes('stalking')) {
          expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.stalking);
        } else if (behaviorType.includes('control')) {
          expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.control);
        } else if (behaviorType.includes('threat')) {
          expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.threats);
        } else if (behaviorType.includes('emotional')) {
          expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.emotional_abuse);
        } else if (behaviorType.includes('escalation')) {
          expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.escalation_patterns);
        }
      }
    }
  }

  // 2. DIRECT CONCEPT MATCHING with fuzzy matching
  for (const [concept, synonyms] of Object.entries(LEGAL_CONCEPT_MAPPINGS)) {
    // Exact matches
    if (normalizedQuery.includes(concept) || synonyms.some(syn => normalizedQuery.includes(syn))) {
      expandedTerms.push(...synonyms);
      matchedConcepts.push(concept);
    }
    
    // Fuzzy matching for typos and variations
    const queryWords = normalizedQuery.split(/\s+/);
    for (const word of queryWords) {
      if (word.length > 3) {
        // Check fuzzy match against concept name
        if (isFuzzyMatch(word, concept)) {
          expandedTerms.push(...synonyms);
          matchedConcepts.push(concept);
        }
        
        // Check fuzzy match against synonyms
        for (const synonym of synonyms) {
          if (isFuzzyMatch(word, synonym)) {
            expandedTerms.push(...synonyms);
            matchedConcepts.push(concept);
            break;
          }
        }
      }
    }
  }

  // 3. ENHANCED AI ANALYSIS with domestic violence context
  if (openAIApiKey && query.length > 10) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: 'system',
              content: `You are an expert domestic violence and family law AI with deep contextual understanding of how abuse manifests in evidence and the legal framework for NSW family court proceedings.

ADVANCED EXPERTISE:
- NSW Family Law Act, AVO legislation, and coercive control laws 
- Power & Control Wheel dynamics and comprehensive abuse patterns
- Behavioral pattern recognition across all forms of abuse
- Evidence interpretation in domestic violence contexts
- Risk assessment and safety planning frameworks
- Legal significance of seemingly minor incidents

CONTEXTUAL UNDERSTANDING MISSION:
Transform behavioral descriptions into comprehensive legal search terms that capture the full context of what victims experience, not just keywords.

ENHANCED BEHAVIORAL PATTERN RECOGNITION:
1. SURVEILLANCE & MONITORING PATTERNS:
   - Digital: "checking phone", "tracking location", "reading messages", "monitoring social media"
   - Physical: "following me", "showing up unexpectedly", "watching my house", "knows where I go"
   - Systematic: "always knows", "keeps tabs", "checks up on me", "surveillance"

2. ISOLATION & CONTROL TACTICS:
   - Social: "won't let me see friends", "makes me cancel plans", "isolates me from family"
   - Economic: "controls money", "hidden accounts", "won't let me work", "takes my pay"
   - Movement: "won't let me drive", "takes car keys", "controls where I go"
   - Communication: "takes my phone", "blocks my contacts", "monitors calls"

3. EMOTIONAL MANIPULATION & PSYCHOLOGICAL ABUSE:
   - Gaslighting: "makes me feel crazy", "says things didn't happen", "twists reality"
   - Blame-shifting: "blames me for everything", "says it's my fault", "victim blaming"
   - Minimization: "says it's not that bad", "downplays abuse", "trivializes harm"
   - Intimidation: "scary looks", "destroys my things", "threatens", "shows weapons"

4. ESCALATION & PATTERN RECOGNITION:
   - Frequency: "getting worse", "more often", "happening more", "escalating"
   - Severity: "crossed new lines", "never done this before", "getting violent"
   - Control expansion: "new ways of controlling", "different tactics", "more restrictions"

5. LEGAL SYSTEM ABUSE:
   - Process abuse: "uses court system", "false claims", "weaponizes legal process"
   - Children as weapons: "threatens custody", "bad-mouths me to kids", "uses kids against me"
   - Violation patterns: "breaks restraining orders", "ignores court orders", "contempt"

CONTEXTUAL QUERY ENHANCEMENT:
- Map emotional language to specific legal concepts
- Recognize temporal indicators and patterns
- Identify safety concerns and their legal implications
- Understand evidence corroboration needs
- Detect gaps that might weaken legal positions

Return ONLY valid JSON:
{
  "concepts": ["specific_legal_concepts"],
  "synonyms": ["comprehensive_search_terms"], 
  "behavioral_indicators": ["recognized_abuse_patterns"],
  "risk_factors": ["safety_and_escalation_indicators"],
  "legal_significance": "brief explanation of legal relevance",
  "contextual_understanding": "interpretation of user's underlying needs"
}

No markdown, no explanations outside JSON structure.`
            },
            {
              role: 'user',
              content: `Analyze this evidence search query with deep contextual understanding and identify all relevant legal concepts, behavioral patterns, and comprehensive search terms: "${query}"`
            }
          ],
          max_completion_tokens: 600,
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
            if (analysis.risk_factors && Array.isArray(analysis.risk_factors)) {
              expandedTerms.push(...analysis.risk_factors);
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

  // 4. CONTEXTUAL EXPANSION - Add related terms based on matched concepts
  const uniqueConcepts = [...new Set(matchedConcepts)];
  for (const concept of uniqueConcepts) {
    // Add frequency patterns if we detected controlling behaviors
    if (['control', 'stalking', 'communication_harassment'].includes(concept)) {
      expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.frequency_patterns);
    }
    
    // Add escalation patterns if we detected any abuse type
    if (['violence', 'threats', 'emotional_abuse'].includes(concept)) {
      expandedTerms.push(...LEGAL_CONCEPT_MAPPINGS.escalation_patterns);
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

    // Step 3: Process and format results with navigation data
    const processedResults: SearchResult[] = rawResults.map(result => {
      const contextualExcerpt = extractContextualExcerpt(result.text, expandedTerms);
      const highlightedText = highlightSearchTerms(contextualExcerpt, expandedTerms);
      
      // Enhanced concept matching with behavioral pattern recognition
      const matchedConcepts = concepts.filter(concept => {
        // Check if any expanded terms for this concept appear in the text
        const conceptTerms = LEGAL_CONCEPT_MAPPINGS[concept] || [];
        return conceptTerms.some(term => 
          result.text.toLowerCase().includes(term.toLowerCase())
        ) || expandedTerms.some(term => 
          result.text.toLowerCase().includes(term.toLowerCase())
        );
      });
      
      return {
        evidence_id: result.file_id,
        file_name: result.file_name,
        excerpt: contextualExcerpt,
        relevance_score: result.score,
        concepts_matched: matchedConcepts,
        legal_significance: result.legal_significance,
        category: result.meta?.category || 'evidence',
        created_at: result.created_at,
        highlighted_text: highlightedText,
        // Add navigation data for click-to-evidence functionality
        chunk_id: result.id,
        chunk_sequence: result.seq || 0,
        navigation_url: `/evidence?fileId=${result.file_id}&chunkId=${result.id}&highlight=${encodeURIComponent(query)}`
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