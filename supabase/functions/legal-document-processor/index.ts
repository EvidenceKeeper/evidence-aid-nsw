import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      documentTitle, 
      documentType, 
      jurisdiction, 
      sourceUrl, 
      documentContent 
    } = await req.json();

    if (!documentTitle || !documentContent) {
      return new Response(
        JSON.stringify({ error: 'Document title and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Processing legal document: "${documentTitle}"`);

    // Create the document record
    const { data: document, error: docError } = await supabase
      .from('legal_documents')
      .insert({
        title: documentTitle,
        document_type: documentType || 'act',
        jurisdiction: jurisdiction || 'NSW',
        source_url: sourceUrl,
        status: 'processing',
      })
      .select()
      .single();

    if (docError) {
      console.error('Document creation error:', docError);
      return new Response(
        JSON.stringify({ error: 'Failed to create document record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Document created with ID: ${document.id}`);

    // Process document content with AI to extract structured sections
    console.log('🤖 Using AI to parse document structure...');

    const structurePrompt = `
You are a legal document processor. Analyze the following legal document and extract its hierarchical structure.

Document Title: ${documentTitle}
Document Type: ${documentType || 'act'}
Jurisdiction: ${jurisdiction || 'NSW'}

Parse the content and identify:
1. Parts, Chapters, Sections, Subsections, and Paragraphs
2. Section numbers (e.g., "54D", "Part 3", "Chapter 2")
3. Section titles
4. Legal concepts and keywords for each section
5. Cross-references between sections

Return a JSON array of sections in this format:
{
  "sections": [
    {
      "section_number": "54D",
      "section_type": "section",
      "title": "Coercive control",
      "content": "Full section text...",
      "level": 1,
      "order_index": 1,
      "legal_concepts": ["coercive control", "domestic violence", "criminal offence"],
      "cross_references": ["54A", "54B"]
    }
  ]
}

Document Content:
${documentContent.substring(0, 15000)}...
`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a legal document processing expert. Parse legal documents into structured hierarchical sections. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: structurePrompt
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      console.error('OpenAI API error:', await aiResponse.text());
      throw new Error('AI processing failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    let parsedSections: any[];
    try {
      const parsed = JSON.parse(aiContent);
      parsedSections = parsed.sections || [];
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: create a single section with the entire content
      parsedSections = [{
        section_number: '1',
        section_type: 'section',
        title: documentTitle,
        content: documentContent,
        level: 1,
        order_index: 1,
        legal_concepts: ['legislation'],
        cross_references: []
      }];
    }

    console.log(`📝 AI parsed ${parsedSections.length} sections`);

    // Insert sections into the database
    const sectionsToInsert = parsedSections.map((section, index) => ({
      document_id: document.id,
      section_number: section.section_number,
      section_type: section.section_type,
      title: section.title,
      content: section.content,
      level: section.level || 1,
      order_index: section.order_index || index,
      citation_reference: `s ${section.section_number} ${documentTitle}`,
      legal_concepts: section.legal_concepts || [],
      cross_references: [], // Will be populated in post-processing
    }));

    const { error: sectionsError } = await supabase
      .from('legal_sections')
      .insert(sectionsToInsert);

    if (sectionsError) {
      console.error('Sections insertion error:', sectionsError);
      throw new Error('Failed to insert sections');
    }

    // Update document with total sections count
    await supabase
      .from('legal_documents')
      .update({ 
        total_sections: parsedSections.length,
        status: 'active' 
      })
      .eq('id', document.id);

    console.log(`✅ Document processing completed: ${parsedSections.length} sections indexed`);

    return new Response(JSON.stringify({
      documentId: document.id,
      title: documentTitle,
      sectionsProcessed: parsedSections.length,
      status: 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in legal-document-processor:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});