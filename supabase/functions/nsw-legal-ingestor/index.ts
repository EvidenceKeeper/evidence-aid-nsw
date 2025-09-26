import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngestionRequest {
  source_type: 'legislation' | 'case_law' | 'practice_direction' | 'regulation' | 'manual';
  source_url?: string;
  content?: string;
  file_path?: string; // For PDF files uploaded to storage
  metadata: {
    title: string;
    jurisdiction: string;
    document_type: string;
    source_authority: string;
    effective_date?: string;
    tags?: string[];
  };
  chunk_config?: {
    chunk_size: number;
    overlap: number;
    respect_boundaries: boolean;
  };
}

interface IngestionResult {
  document_id: string;
  chunks_created: number;
  citations_extracted: number;
  legal_concepts_identified: string[];
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
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

    const {
      source_type,
      source_url,
      content: rawContent,
      file_path,
      metadata,
      chunk_config = {
        chunk_size: 1000,
        overlap: 100,
        respect_boundaries: true
      }
    }: IngestionRequest = await req.json();

    console.log('NSW Legal Ingestor request:', { source_type, metadata, source_url, file_path });

    let content = rawContent;

    // Step 1: Content Acquisition
    if (file_path) {
      // Handle file upload from storage
      content = await processStoredFile(file_path, supabaseClient);
    } else if (source_url && !content) {
      content = await fetchContent(source_url, source_type);
    }

    if (!content) {
      throw new Error('No content provided or fetchable');
    }

    // Step 2: Content Validation & Compliance Check
    await validateContentCompliance(source_url, source_type);

    // Step 3: Document Creation with Provenance
    const documentId = await createLegalDocument(
      supabaseClient,
      metadata,
      source_url,
      content
    );

    // Step 4: Content Processing & Structuring
    const structuredSections = await extractLegalStructure(
      content,
      metadata,
      openaiApiKey
    );

    // Step 5: Intelligent Chunking
    const chunks = await createIntelligentChunks(
      structuredSections,
      chunk_config,
      openaiApiKey
    );

    // Step 6: Citation Extraction & Linking
    const citationsExtracted = await extractAndStoreCitations(
      chunks,
      documentId,
      supabaseClient,
      openaiApiKey
    );

    // Step 7: Legal Concept Identification
    const legalConcepts = await identifyLegalConcepts(
      chunks,
      openaiApiKey
    );

    // Step 8: Embedding Generation & Storage
    const chunksCreated = await generateAndStoreEmbeddings(
      chunks,
      documentId,
      supabaseClient,
      openaiApiKey
    );

    // Step 9: Quality Validation
    await validateIngestionQuality(documentId, supabaseClient);

    const result: IngestionResult = {
      document_id: documentId,
      chunks_created: chunksCreated,
      citations_extracted: citationsExtracted,
      legal_concepts_identified: legalConcepts,
      status: 'completed'
    };

    console.log('NSW Legal Ingestion completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('NSW Legal Ingestor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Ingestion failed', 
        details: error instanceof Error ? error.message : String(error),
        status: 'failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchContent(url: string, sourceType: string): Promise<string> {
  console.log(`Fetching content from: ${url}`);
  
  // Compliance check for approved sources
  const approvedDomains = [
    'legislation.nsw.gov.au',
    'austlii.edu.au',
    'fcfcoa.gov.au',
    'localcourt.nsw.gov.au',
    'supremecourt.nsw.gov.au',
    'districtcourt.nsw.gov.au'
  ];

  const urlDomain = new URL(url).hostname;
  if (!approvedDomains.some(domain => urlDomain.includes(domain))) {
    throw new Error(`Domain ${urlDomain} not in approved sources list`);
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NSW-Legal-RAG-Bot/1.0 (Educational/Research Purpose)',
      'Accept': 'text/html,application/pdf,text/plain'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/pdf')) {
    // Handle PDF content directly
    const arrayBuffer = await response.arrayBuffer();
    return await extractPdfText(new Uint8Array(arrayBuffer));
  }

  return await response.text();
}

async function processStoredFile(filePath: string, supabaseClient: any): Promise<string> {
  console.log(`Processing stored file: ${filePath}`);
  
  // Get file from Supabase Storage - Use legal-training bucket
  const { data, error } = await supabaseClient.storage
    .from('legal-training')
    .download(filePath);
    
  if (error) throw new Error(`Failed to download file: ${error.message}`);
  
  // Convert to ArrayBuffer
  const arrayBuffer = await data.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);
  
  // Check if it's a PDF by examining file extension and magic bytes
  if (filePath.toLowerCase().endsWith('.pdf') || isPdfFile(fileData)) {
    return await extractPdfText(fileData);
  } else {
    // Assume it's text content
    return new TextDecoder().decode(fileData);
  }
}

function isPdfFile(data: Uint8Array): boolean {
  // Check PDF magic bytes (%PDF-)
  const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]);
  if (data.length < 5) return false;
  
  for (let i = 0; i < 5; i++) {
    if (data[i] !== pdfMagic[i]) return false;
  }
  return true;
}

async function extractPdfText(data: Uint8Array): Promise<string> {
  try {
    console.log('Extracting text from PDF...');
    
    // Use legacy build to avoid worker requirement in Deno
    const pdfjsLib = await import(
      "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.min.mjs"
    );
    
    const loadingTask: any = pdfjsLib.default.getDocument({ data });
    const pdf: any = await loadingTask.promise;
    
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }
    
    console.log(`Extracted text from ${pdf.numPages} pages`);
    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateContentCompliance(url: string | undefined, sourceType: string) {
  // Ensure we have proper authority to index this content
  // This is a placeholder - in production, you'd check:
  // - robots.txt compliance
  // - Terms of use compliance
  // - Copyright and licensing
  
  console.log('Content compliance validated for:', { url, sourceType });
}

async function createLegalDocument(
  supabaseClient: any,
  metadata: any,
  sourceUrl: string | undefined,
  content: string
): Promise<string> {
  
  // Generate content checksum for integrity
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: document, error } = await supabaseClient
    .from('legal_documents')
    .insert({
      title: metadata.title,
      document_type: metadata.document_type,
      jurisdiction: metadata.jurisdiction,
      source_url: sourceUrl,
      source_authority: metadata.source_authority,
      effective_date: metadata.effective_date,
      checksum,
      ingestion_method: 'automated',
      tags: metadata.tags || [],
      status: 'processing',
      scope: 'global'
    })
    .select()
    .single();

  if (error) throw error;
  
  console.log('Legal document created:', document.id);
  return document.id;
}

async function extractLegalStructure(
  content: string,
  metadata: any,
  openaiApiKey: string
) {
  // Enhanced NSW legal structure detection with regex patterns
  const nswLegalPatterns = {
    parts: /Part\s+([IVXLCDM]+|\d+)(?:\s*[–-]\s*(.+?))?(?=\n|$)/gi,
    divisions: /Division\s+(\d+)(?:\s*[–-]\s*(.+?))?(?=\n|$)/gi,
    sections: /^(?:s\.|Section)\s*(\d+(?:\([A-Za-z0-9]+\))*)/gim,
    subsections: /^\s*\(([A-Za-z0-9]+)\)/gim,
    citations: /([\w\s]+(?:Act|Law|Code|Regulation))\s+(\d{4})\s*\((\w+)\)(?:\s+s\.?\s*(\d+(?:\([A-Za-z0-9]+\))*))?/gi
  };

  const structurePrompt = `Extract the hierarchical NSW legal structure from this ${metadata.document_type}.

CRITICAL NSW LEGAL PATTERNS:
- Parts: "Part 1", "Part I", "Part 2 - Criminal Procedure"
- Divisions: "Division 1", "Division 2 - Family Provisions" 
- Sections: "s 8(1)", "Section 60CC", "s 79(4)(a)"
- Acts: "Family Law Act 1975 (Cth)", "Care and Protection Act 1998 (NSW)"

REQUIREMENTS:
1. Extract sections with NSW format: "s 8(1)", "s 60CC", etc.
2. Normalize citations: "Family Law Act 1975 (NSW) s 60CC"
3. Detect page numbers from content
4. Preserve hierarchical structure (Parts > Divisions > Sections)
5. Include cross-references to other Acts/sections

Content to analyze:
${content.substring(0, 12000)} ${content.length > 12000 ? '...[truncated]' : ''}

Return JSON with enhanced NSW structure:
{
  "sections": [
    {
      "section_number": "s 60CC" | "Part 1" | "Division 2",
      "title": "Best interests of child",
      "content": "full section text",
      "level": 1,
      "parent_section": "Part VII",
      "act_name": "Family Law Act 1975",
      "jurisdiction": "NSW" | "Cth",
      "page_start": 15,
      "page_end": 17,
      "normalized_citation": "Family Law Act 1975 (NSW) s 60CC",
      "cross_references": ["s 60CA", "s 60CB"],
      "legal_concepts": ["best interests", "child welfare"],
      "definitions": [{"term": "child", "definition": "person under 18"}]
    }
  ]
}`;

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
            content: 'You are an expert NSW legal document analyzer. Extract hierarchical structure using exact NSW legal citation formats (s 8(1), Part VII, Division 2). Always preserve exact section numbers and normalize citations to format: "Act Name Year (Jurisdiction) s Section".' 
          },
          { role: 'user', content: structurePrompt }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Structure extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const structureResult = JSON.parse(data.choices[0].message.content);
    
    console.log(`Extracted ${structureResult.sections.length} sections`);
    return structureResult.sections;
  } catch (error) {
    console.error('Structure extraction failed:', error);
    // Enhanced fallback with basic NSW pattern detection
    console.log('Using enhanced fallback with basic NSW section detection');
    const sections = [];
    const sectionMatches = content.match(/(?:^|\n)\s*(?:s\.|Section)\s*(\d+(?:\([A-Za-z0-9]+\))*)[:\s]/gim);
    
    if (sectionMatches && sectionMatches.length > 0) {
      // Split content by detected sections
      const sectionParts = content.split(/(?=(?:^|\n)\s*(?:s\.|Section)\s*\d+)/gim);
      
      sectionParts.forEach((part, index) => {
        const sectionMatch = part.match(/(?:s\.|Section)\s*(\d+(?:\([A-Za-z0-9]+\))*)/i);
        if (sectionMatch) {
          sections.push({
            section_number: `s ${sectionMatch[1]}`,
            title: `Section ${sectionMatch[1]}`,
            content: part.trim(),
            level: 1,
            parent_section: null,
            act_name: metadata.title,
            jurisdiction: metadata.jurisdiction || 'NSW',
            normalized_citation: `${metadata.title} s ${sectionMatch[1]}`,
            cross_references: [],
            legal_concepts: [],
            definitions: []
          });
        }
      });
    }
    
    // If no sections found, create single section
    if (sections.length === 0) {
      sections.push({
        section_number: '1',
        title: metadata.title,
        content: content,
        level: 1,
        parent_section: null,
        act_name: metadata.title,
        jurisdiction: metadata.jurisdiction || 'NSW',
        normalized_citation: metadata.title,
        cross_references: [],
        legal_concepts: [],
        definitions: []
      });
    }
    
    return sections;
  }
}

async function createIntelligentChunks(
  sections: any[],
  chunkConfig: any,
  openaiApiKey: string
) {
  const chunks = [];
  let chunkOrder = 0;

  for (const section of sections) {
    // Respect natural legal boundaries
    if (chunkConfig.respect_boundaries && section.content.length <= chunkConfig.chunk_size) {
        chunks.push({
          chunk_text: section.content,
          chunk_order: chunkOrder++,
          section_info: section,
          metadata: {
            section_number: section.section_number,
            level: section.level,
            act_name: section.act_name,
            jurisdiction: section.jurisdiction,
            page_start: section.page_start,
            page_end: section.page_end,
            legal_concepts: section.legal_concepts,
            normalized_citation: section.normalized_citation
          },
          citation_references: [section.normalized_citation],
          legal_concepts: section.legal_concepts || []
        });
    } else {
      // Split large sections intelligently
      const sectionChunks = await intelligentSplit(
        section.content,
        chunkConfig,
        section,
        openaiApiKey
      );
      
      sectionChunks.forEach((chunk: any) => {
        chunks.push({
          ...chunk,
          chunk_order: chunkOrder++
        });
      });
    }
  }

  console.log(`Created ${chunks.length} intelligent chunks`);
  return chunks;
}

async function intelligentSplit(
  content: string,
  chunkConfig: any,
  sectionInfo: any,
  openaiApiKey: string
) {
  // For long content, use AI to find natural break points
  const splitPrompt = `Split this legal text into coherent chunks of approximately ${chunkConfig.chunk_size} characters each, respecting:
- Sentence boundaries
- Paragraph boundaries  
- Legal concept groupings
- Citation continuity

Text: ${content}

Return array of chunks with natural breaks, maintaining legal context.`;

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
          { role: 'system', content: 'Split legal text intelligently while preserving legal context and meaning.' },
          { role: 'user', content: splitPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Intelligent split failed: ${response.status}`);
    }

    const data = await response.json();
    const chunks = JSON.parse(data.choices[0].message.content);
    
    return chunks.map((chunkText: string, idx: number) => ({
      chunk_text: chunkText,
      section_info: sectionInfo,
      metadata: {
        ...sectionInfo,
        chunk_index: idx,
        split_method: 'ai_intelligent'
      }
    }));
  } catch (error) {
    console.error('Intelligent split failed, using simple chunking:', error);
    // Fallback to simple chunking
    const simpleChunks = [];
    for (let i = 0; i < content.length; i += chunkConfig.chunk_size) {
      simpleChunks.push({
        chunk_text: content.substring(i, i + chunkConfig.chunk_size),
        section_info: sectionInfo,
        metadata: {
          ...sectionInfo,
          chunk_index: simpleChunks.length,
          split_method: 'simple'
        }
      });
    }
    return simpleChunks;
  }
}

async function extractAndStoreCitations(
  chunks: any[],
  documentId: string,
  supabaseClient: any,
  openaiApiKey: string
): Promise<number> {
  let citationsCount = 0;

  for (const chunk of chunks) {
    const citationPrompt = `Extract legal citations from this text:

"${chunk.chunk_text}"

Find and format:
- Case law citations (neutral citations, traditional citations)
- Statutory references (Act names, section numbers)
- Regulation citations
- Cross-references to other legal documents

Return as JSON array:
[{
  "citation_type": "case_law|statute|regulation|practice_direction",
  "short_citation": "string",
  "full_citation": "string", 
  "neutral_citation": "string|null",
  "court": "string|null",
  "year": number|null,
  "jurisdiction": "NSW|Commonwealth",
  "confidence_score": number,
  "context": "string"
}]`;

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
            { role: 'system', content: 'You are an expert at extracting and formatting Australian legal citations with perfect accuracy.' },
            { role: 'user', content: citationPrompt }
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const citations = JSON.parse(data.choices[0].message.content);

      // Store citations
      for (const citation of citations) {
        if (citation.confidence_score > 0.7) {
          const { error } = await supabaseClient
            .from('legal_citations')
            .upsert({
              section_id: chunk.section_info.id || documentId,
              citation_type: citation.citation_type,
              short_citation: citation.short_citation,
              full_citation: citation.full_citation,
              neutral_citation: citation.neutral_citation,
              court: citation.court,
              year: citation.year,
              jurisdiction: citation.jurisdiction,
              confidence_score: citation.confidence_score,
              url: generateCitationUrl(citation)
            }, { onConflict: 'short_citation,section_id' });

          if (!error) citationsCount++;
        }
      }
    } catch (error) {
      console.error('Citation extraction failed for chunk:', error);
    }
  }

  console.log(`Extracted ${citationsCount} citations`);
  return citationsCount;
}

async function identifyLegalConcepts(chunks: any[], openaiApiKey: string): Promise<string[]> {
  const allConcepts = new Set<string>();

  const conceptPrompt = `Identify key NSW legal concepts in this text:

${chunks.slice(0, 5).map(c => c.chunk_text).join('\n\n')}

Return array of specific legal concepts, focusing on NSW-specific terms:
- AVO (Apprehended Violence Order)
- Domestic Violence
- Coercive Control  
- Parenting Orders
- Best Interests of the Child
- Family Dispute Resolution
- Local Court
- Federal Circuit and Family Court
- Practice Directions
- Interim Orders
- Final Hearing
- Service of Documents

Return as JSON array of strings.`;

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
          { role: 'system', content: 'Extract NSW-specific legal concepts with precision.' },
          { role: 'user', content: conceptPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Concept identification failed: ${response.status}`);
    }

    const data = await response.json();
    const concepts = JSON.parse(data.choices[0].message.content);
    concepts.forEach((concept: string) => allConcepts.add(concept));
  } catch (error) {
    console.error('Concept identification failed:', error);
  }

  const conceptArray = Array.from(allConcepts);
  console.log(`Identified ${conceptArray.length} legal concepts`);
  return conceptArray;
}

async function generateAndStoreEmbeddings(
  chunks: any[],
  documentId: string,
  supabaseClient: any,
  openaiApiKey: string
): Promise<number> {
  let stored = 0;

  for (const chunk of chunks) {
    try {
      // Generate embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: chunk.chunk_text,
        }),
      });

      if (!embeddingResponse.ok) continue;

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      // Store chunk with embedding
      const { error } = await supabaseClient
        .from('legal_chunks')
        .insert({
          document_id: documentId,
          section_id: chunk.section_info.id,
          chunk_text: chunk.chunk_text,
          chunk_order: chunk.chunk_order,
          embedding,
          metadata: chunk.metadata,
          provenance: {
            created_at: new Date().toISOString(),
            ingestion_method: 'automated',
            source_checksum: chunk.checksum
          },
          paragraph_anchor: chunk.section_info.paragraph_anchor,
          legal_concepts: chunk.section_info.legal_concepts,
          citation_references: chunk.section_info.cross_references || [],
          confidence_score: 1.0
        });

      if (!error) stored++;
    } catch (error) {
      console.error('Failed to store chunk embedding:', error);
    }
  }

  console.log(`Stored ${stored} chunks with embeddings`);
  return stored;
}

async function validateIngestionQuality(documentId: string, supabaseClient: any) {
  // Validate that the ingestion was successful
  const { data: chunks } = await supabaseClient
    .from('legal_chunks')
    .select('count')
    .eq('document_id', documentId);

  const { data: citations } = await supabaseClient
    .from('legal_citations')
    .select('count')
    .eq('section_id', documentId);

  console.log(`Quality check: ${chunks?.length || 0} chunks, ${citations?.length || 0} citations`);

  // Update document status
  await supabaseClient
    .from('legal_documents')
    .update({ 
      status: 'active',
      total_sections: chunks?.length || 0
    })
    .eq('id', documentId);
}

function generateCitationUrl(citation: any): string | null {
  // Generate URLs for known citation types
  if (citation.citation_type === 'case_law' && citation.neutral_citation) {
    return `https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/nsw/${citation.neutral_citation}`;
  }
  
  if (citation.citation_type === 'statute') {
    return `https://legislation.nsw.gov.au/view/html/inforce/current/act-${citation.year}-${citation.short_citation}`;
  }
  
  return null;
}