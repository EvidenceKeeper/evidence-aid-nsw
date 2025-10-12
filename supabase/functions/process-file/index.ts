import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { path } = await req.json();
    console.log(`📄 Processing file: ${path} for user: ${user.id}`);

    // 1. Get signed URL for the file
    const { data: urlData, error: urlError } = await supabase.storage
      .from('evidence')
      .createSignedUrl(path, 3600);

    if (urlError || !urlData?.signedUrl) {
      throw new Error(`Failed to get file URL: ${urlError?.message}`);
    }

    // 2. Download file content
    const fileResponse = await fetch(urlData.signedUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }

    const blob = await fileResponse.blob();
    const contentType = fileResponse.headers.get('content-type') || 'text/plain';
    
    let textContent = '';
    
    // 3. Extract text based on content type
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      textContent = await blob.text();
    } else if (contentType.includes('application/pdf')) {
      // For PDFs, we'll store a placeholder and let user know to convert
      textContent = `[PDF file: ${path.split('/').pop()}]\n\nNote: For best results, please convert PDF to text before uploading.`;
    } else {
      textContent = `[Binary file: ${path.split('/').pop()}]\n\nContent type: ${contentType}`;
    }

    const fileName = path.split('/').pop() || 'unknown';

    // 4. Create file record
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        name: fileName,
        storage_path: path,
        mime_type: contentType,
        size: blob.size,
        status: 'processed',
        meta: { extracted_at: new Date().toISOString() },
        provenance: {
          uploaded_at: new Date().toISOString(),
          processed_by: 'process-file',
          processing_type: 'text_extraction'
        }
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`Failed to create file record: ${fileError.message}`);
    }

    // 5. Store full text in single chunk (no embedding needed!)
    const { error: chunkError } = await supabase
      .from('chunks')
      .insert({
        file_id: fileData.id,
        seq: 0,
        text: textContent,
        meta: {
          content_type: contentType,
          file_size: blob.size,
          extracted_at: new Date().toISOString()
        }
      });

    if (chunkError) {
      throw new Error(`Failed to store chunk: ${chunkError.message}`);
    }

    console.log(`✅ File processed successfully: ${fileName}`);

    return new Response(JSON.stringify({
      success: true,
      file_id: fileData.id,
      file_name: fileName,
      text_length: textContent.length,
      message: 'File processed and ready for chat'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ File processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'File processing failed: ' + (error.message || 'Unknown error'),
      code: 'PROCESSING_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
