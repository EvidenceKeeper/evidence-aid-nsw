import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log(`Testing assistant chat for user: ${user.email}`);

    // Test legal chunks query
    const { data: legalChunks, error: legalError } = await supabase
      .rpc('match_legal_chunks', {
        query_embedding: '[0.1,0.2,0.3]', // Dummy embedding for test
        match_threshold: 0.3,
        match_count: 5
      });

    console.log('Legal chunks result:', { legalChunks, legalError });

    // Test user role detection
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    console.log('User role result:', { roleData, roleError });

    // Test legal documents count
    const { data: legalDocs, error: docsError } = await supabase
      .from('legal_documents')
      .select('id, title, status, scope')
      .eq('status', 'active');

    console.log('Legal documents:', { count: legalDocs?.length || 0, legalDocs, docsError });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        user_email: user.email,
        user_role: roleData?.[0]?.role || 'user',
        legal_documents_count: legalDocs?.length || 0,
        legal_chunks_available: legalChunks?.length || 0,
        legal_chunks_error: legalError?.message || null,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});