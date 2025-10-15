import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Legal Document Processor starting...');

    // Get pending documents from the queue
    const { data: pendingDocs, error: queueError } = await supabaseClient
      .from('legal_document_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5); // Process 5 at a time

    if (queueError) {
      throw new Error(`Queue fetch error: ${queueError.message}`);
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      console.log('No pending documents to process');
      return new Response(
        JSON.stringify({ message: 'No pending documents', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingDocs.length} documents`);
    let processedCount = 0;
    const results = [];

    for (const doc of pendingDocs) {
      try {
        // Mark as processing
        await supabaseClient
          .from('legal_document_processing_queue')
          .update({ 
            status: 'processing', 
            started_at: new Date().toISOString() 
          })
          .eq('id', doc.id);

        console.log(`Processing document: ${doc.file_name}`);

        // Call nsw-legal-ingestor function with enhanced logging
        console.log(`Invoking nsw-legal-ingestor for: ${doc.file_name} at path: ${doc.file_path}`);
        
        const { data: ingestionResult, error: ingestionError } = await supabaseClient.functions
          .invoke('nsw-legal-ingestor', {
            body: {
              source_type: 'legislation',
              file_path: doc.file_path,
              metadata: {
                title: doc.file_name.replace(/\.[^/.]+$/, ""), // Remove file extension
                jurisdiction: 'NSW',
                document_type: 'legislation',
                source_authority: 'NSW Government',
                effective_date: new Date().toISOString().split('T')[0],
                tags: ['training', 'automated']
              },
              chunk_config: {
                chunk_size: 1000,
                overlap: 100,
                respect_boundaries: true
              }
            }
          });
        
        console.log(`Ingestor response for ${doc.file_name}:`, { 
          hasData: !!ingestionResult, 
          hasError: !!ingestionError,
          error: ingestionError ? JSON.stringify(ingestionError) : null
        });

        if (ingestionError) {
          console.error(`Ingestion error for ${doc.file_name}:`, ingestionError);
          
          // Mark as failed
          await supabaseClient
            .from('legal_document_processing_queue')
            .update({ 
              status: 'failed', 
              error_message: ingestionError.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', doc.id);

          results.push({ 
            file_name: doc.file_name, 
            status: 'failed', 
            error: ingestionError.message 
          });
        } else {
          console.log(`Successfully processed ${doc.file_name}`);
          
          // Mark as completed
          await supabaseClient
            .from('legal_document_processing_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              processing_metadata: {
                ...doc.processing_metadata,
                ingestion_result: ingestionResult
              }
            })
            .eq('id', doc.id);

          processedCount++;
          results.push({ 
            file_name: doc.file_name, 
            status: 'completed',
            document_id: ingestionResult.document_id,
            chunks_created: ingestionResult.chunks_created
          });
        }

      } catch (error) {
        console.error(`Error processing ${doc.file_name}:`, error);
        
        // Mark as failed
        await supabaseClient
          .from('legal_document_processing_queue')
          .update({ 
            status: 'failed', 
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        results.push({ 
          file_name: doc.file_name, 
          status: 'failed', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    console.log(`Processed ${processedCount} documents successfully`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedCount} of ${pendingDocs.length} documents`,
        processed: processedCount,
        results: results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Legal Document Processor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Processing failed', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});