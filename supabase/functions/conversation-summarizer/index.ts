import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { threadId, conversationText, currentGoal } = await req.json();

    if (!conversationText) {
      return new Response(
        JSON.stringify({ error: "conversationText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🧠 Generating intelligent conversation summary for thread ${threadId}`);

    // Create comprehensive prompt for conversation analysis
    const analysisPrompt = `You are an expert legal assistant analyzing a conversation between a user and a legal AI assistant. 

CONVERSATION TO ANALYZE:
${conversationText}

CURRENT USER GOAL: ${currentGoal || 'Not specified'}

Please analyze this conversation and provide a JSON response with the following structure:

{
  "summary": "A 2-3 sentence summary of the key discussion points and progress made",
  "detectedTopics": ["topic1", "topic2", "topic3"],
  "achievements": ["specific progress item 1", "specific progress item 2"],
  "nextActions": ["next logical step 1", "next logical step 2"],
  "conversationTone": "supportive|anxious|confused|confident|frustrated",
  "legalStage": 1-9,
  "keyInsights": ["insight 1", "insight 2"],
  "unresolved": ["unresolved issue 1", "unresolved issue 2"]
}

Focus on:
1. Legal progress and substantive achievements
2. Emotional context and user state
3. Concrete next steps that would be helpful
4. Topics that indicate the user's current legal journey stage
5. Any patterns in questions or concerns

Be specific and actionable. Avoid generic summaries.`;

    // Call OpenAI for intelligent analysis
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an expert conversation analyst specializing in legal consultations. Provide detailed, actionable analysis in valid JSON format." 
          },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 800,
        temperature: 0.3
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const aiData = await openAIResponse.json();
    const analysisText = aiData.choices[0].message.content;

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("Failed to parse AI analysis as JSON:", analysisText);
      // Fallback to basic analysis
      analysis = {
        summary: "Conversation analyzed - detailed summary generation failed",
        detectedTopics: [],
        achievements: [],
        nextActions: [],
        conversationTone: "neutral",
        legalStage: 1,
        keyInsights: [],
        unresolved: []
      };
    }

    // Store the analysis in the database for future reference
    if (threadId) {
      await supabase
        .from('conversation_analysis')
        .upsert({
          thread_id: threadId,
          user_id: userData.user.id,
          analysis_data: analysis,
          conversation_length: conversationText.length,
          analysis_timestamp: new Date().toISOString()
        });
    }

    console.log(`✅ Generated conversation analysis with ${analysis.detectedTopics?.length || 0} topics and ${analysis.nextActions?.length || 0} next actions`);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Conversation summarizer error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to analyze conversation", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});