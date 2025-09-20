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

  if (!openAIApiKey) {
    console.error("OPENAI_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Server not configured. Missing OPENAI_API_KEY." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase env not set");
    return new Response(
      JSON.stringify({ error: "Server not configured. Missing Supabase env." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header received:", authHeader?.substring(0, 20) + "...");
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if it's the anon key (shouldn't be)
    if (authHeader.includes(SUPABASE_ANON_KEY)) {
      console.error("Anon key detected instead of JWT token");
      return new Response(JSON.stringify({ error: "Invalid token: anon key detected" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a supabase client with the user's JWT so RLS policies apply
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log("User data retrieval:", userData?.user?.id ? "success" : "failed", userError?.message);
    
    const user = userData?.user;
    if (!user) {
      console.error("No user found with provided token:", userError?.message);
      return new Response(JSON.stringify({ error: "Invalid user token", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, messages, mode = 'user' } = await req.json();
    if (!prompt && !messages) {
      return new Response(
        JSON.stringify({ error: "Provide 'prompt' (string) or 'messages' (array)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's email for personalized greeting
    const userEmail = user.email;
    const userName = userEmail ? userEmail.split('@')[0] : 'there';

    // Check for substantial evidence and case memory
    const { data: allFiles, error: filesError } = await supabase
      .from("files")
      .select("id, name, created_at, status")
      .eq("user_id", user.id)
      .eq("status", "processed")
      .order("created_at", { ascending: false });

    const { data: totalChunks } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("file_id", allFiles?.[0]?.id || "");

    const hasSubstantialEvidence = (totalChunks?.count || 0) > 100; // Substantial evidence threshold
    
    // Get case memory and evidence analysis for case summary
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: legalStrategy } = await supabase
      .from("legal_strategy")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Get comprehensive evidence analysis for case-aware intelligence
    const { data: comprehensiveAnalysis } = await supabase
      .from("evidence_comprehensive_analysis")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // SMART TRIGGER: If substantial evidence exists but no case analysis has been done, trigger it now
    let analysisTriggered = false;
    if (hasSubstantialEvidence && !caseMemory && !legalStrategy && allFiles && allFiles.length > 0) {
      console.log('🧠 Smart trigger: Substantial evidence detected, initiating case analysis...');
      
      try {
        const analysisResponse = await supabase.functions.invoke('continuous-case-analysis', {
          body: { 
            file_id: allFiles[0].id,
            analysis_type: 'comprehensive_review' 
          }
        });

        if (!analysisResponse.error) {
          console.log('✅ Smart analysis completed');
          analysisTriggered = true;
          
          // Refresh case memory and strategy after analysis
          const { data: newCaseMemory } = await supabase
            .from("case_memory")
            .select("*")
            .eq("user_id", user.id)
            .single();
          
          const { data: newLegalStrategy } = await supabase
            .from("legal_strategy")
            .select("*")
            .eq("user_id", user.id)
            .single();
        }
      } catch (error) {
        console.error('Smart analysis trigger failed:', error);
      }
    }

    const hasRecentUploads = allFiles && allFiles.length > 0;
    const newlyProcessedFiles = allFiles?.slice(0, 5) || [];

    // Simple per-user rate limit: 10 requests per minute
    const windowMs = 60_000;
    const limit = 10;
    const sinceIso = new Date(Date.now() - windowMs).toISOString();

    const { count, error: countErr } = await supabase
      .from("assistant_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sinceIso);

    if (countErr) {
      console.error("Rate limit count error", countErr);
    }

    if ((count ?? 0) >= limit) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this request without IP for privacy (non-blocking failure)
    const insertPromise = supabase.from("assistant_requests").insert({
      user_id: user.id,
    });
    insertPromise.then(({ error }) => error && console.error("Log insert error", error));

    // Build messages and perform lightweight retrieval from user's indexed chunks
    const lastUserText = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m.role === "user")?.content
      : null;
    const queryText = String(prompt ?? lastUserText ?? "").slice(0, 500);

    // Enhanced retrieval: vector search + legal resources + evidence inventory
    let citations: Array<{ index: number; file_id: string; file_name: string; seq: number; excerpt: string; meta: any; type?: string; similarity?: number }> = [];
    let contextBlocks: string[] = [];
    let nswLegalContext: string[] = [];
    let evidenceInventory: string = "";
    let vectorSearchResults: any[] = [];

    // Enhanced evidence inventory with hierarchical summaries
    if (allFiles && allFiles.length > 0) {
      console.log(`Building evidence inventory for ${allFiles.length} files...`);
      
      // Get detailed file information with analysis and summaries
      const { data: detailedFiles } = await supabase
        .from("files")
        .select(`
          id, name, created_at, category, auto_category, meta, tags, exhibit_code, file_summary,
          evidence_analysis (
            analysis_type, content, legal_concepts, confidence_score, relevant_citations
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "processed")
        .order("created_at", { ascending: false });

      if (detailedFiles && detailedFiles.length > 0) {
        const inventoryItems = detailedFiles.map((file: any, index: number) => {
          const analysis = file.evidence_analysis?.[0];
          const uploadDate = new Date(file.created_at).toLocaleDateString();
          const category = file.category || file.auto_category || 'Uncategorized';
          const exhibitCode = file.exhibit_code || String.fromCharCode(65 + index);
          
          let inventoryEntry = `
**EXHIBIT ${exhibitCode} - ${file.name}**
- Uploaded: ${uploadDate}
- Category: ${category}
- File ID: ${file.id}`;

          // Add file summary if available
          if (file.file_summary) {
            inventoryEntry += `
- Summary: ${file.file_summary}`;
          }

          if (analysis) {
            inventoryEntry += `
- Analysis: ${analysis.analysis_type}
- Legal Concepts: ${JSON.stringify(analysis.legal_concepts)}
- Confidence: ${Math.round((analysis.confidence_score || 0) * 100)}%
- Key Findings: ${analysis.content?.substring(0, 200)}...`;
            
            if (analysis.relevant_citations) {
              inventoryEntry += `
- Legal Citations: ${JSON.stringify(analysis.relevant_citations)}`;
            }
          }

          if (file.tags && file.tags.length > 0) {
            inventoryEntry += `
- Tags: ${file.tags.join(', ')}`;
          }

          return inventoryEntry;
        }).join('\n\n');

        evidenceInventory = `
=== ENHANCED EVIDENCE INVENTORY (${detailedFiles.length} files) ===
${inventoryItems}

=== EVIDENCE ANALYSIS INSTRUCTIONS ===
When referencing evidence, use the EXHIBIT designations above (e.g., "Exhibit A shows..." or "In your uploaded police report (Exhibit B)..."). Always quote specific content from these files when providing analysis. Each exhibit has been analyzed for legal significance and may have summaries available - reference both the analysis findings and file summaries to provide comprehensive guidance.
`;
      }
    }

    if (queryText) {
      console.log("🔍 Performing enhanced vector search...");
      
      // Generate embedding for the query
      let queryEmbedding: number[] | null = null;
      try {
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-large",
            input: queryText,
            dimensions: 1536,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data[0].embedding;
        }
      } catch (error) {
        console.error("Failed to generate query embedding:", error);
      }

      // Perform vector similarity search on user's files
      if (queryEmbedding) {
        const { data: vectorResults, error: vectorError } = await supabase.rpc(
          "match_user_chunks",
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.6,
            match_count: 15,
            filter_user_id: user.id,
          }
        );

        if (!vectorError && vectorResults?.length) {
          console.log(`✅ Found ${vectorResults.length} vector matches`);
          vectorSearchResults = vectorResults;
          
          citations = vectorResults.map((result: any, i: number) => ({
            index: i + 1,
            file_id: result.file_id,
            file_name: result.file_name,
            seq: result.seq,
            excerpt: result.text.slice(0, 500),
            meta: result.meta,
            type: "user_file_vector",
            similarity: Math.round(result.similarity * 100),
          }));

          contextBlocks = citations.map((c) => 
            `[CITATION ${c.index}] ${c.file_name}#${c.seq} (${c.similarity}% match): ${c.excerpt}`
          );
        }
      }

      // Fallback to text search if vector search fails or returns no results
      if (!vectorSearchResults.length) {
        console.log("📝 Falling back to text search...");
        
        // Expanded search terms for coercive control patterns
        const coerciveControlTerms = [
          queryText,
          queryText + " coercive control domestic violence",
          queryText + " emotional abuse financial control",
          queryText + " intimidation stalking threats",
          "pattern behaviour isolation monitoring"
        ];

        // Search user's uploaded chunks (increased limit for comprehensive analysis)
        const { data: chunkRows, error: chunkErr } = await supabase
          .from("chunks")
          .select("id, file_id, seq, text, meta")
          .textSearch("tsv", coerciveControlTerms.join(" | "), { type: "websearch" })
          .limit(20);

        // Search NSW legal resources for relevant law and procedures
        const { data: legalRows, error: legalErr } = await supabase
          .from("nsw_legal_resources")
          .select("id, title, content, category, reference, url")
          .textSearch("tsv", queryText + " coercive control domestic violence", { type: "websearch" })
          .limit(8);

        if (!chunkErr && chunkRows && chunkRows.length) {
          const fileIds = Array.from(new Set(chunkRows.map((c: any) => c.file_id)));
          const { data: fileRows } = await supabase
            .from("files")
            .select("id, name")
            .in("id", fileIds);
          const nameById: Record<string, string> = {};
          fileRows?.forEach((f: any) => (nameById[f.id] = f.name));

          // Prioritize more chunks for comprehensive analysis (increased from 6 to 15)
          const byFile: Record<string, any[]> = {};
          for (const c of chunkRows) {
            (byFile[c.file_id] ||= []).push(c);
          }
          const selected: any[] = [];
          let layer = 0;
          while (selected.length < 15) {
            let advanced = false;
            for (const fid of Object.keys(byFile)) {
              const arr = byFile[fid];
              if (arr[layer]) {
                selected.push(arr[layer]);
                advanced = true;
                if (selected.length >= 15) break;
              }
            }
            if (!advanced) break;
            layer++;
          }
          const finalSel = selected.length ? selected : chunkRows.slice(0, 15);

          citations = finalSel.map((c: any, i: number) => ({
            index: i + 1,
            file_id: c.file_id,
            file_name: nameById[c.file_id] ?? "File",
            seq: c.seq,
            excerpt: String(c.text ?? '').slice(0, 500),
            meta: c.meta ?? {},
            type: "user_file"
          }));
          contextBlocks = citations.map((c) => `[CITATION ${c.index}] ${c.file_name}#${c.seq}: ${c.excerpt}`);
        }
      }

      // Add NSW legal resources to context
      const { data: legalRows, error: legalErr } = await supabase
        .from("nsw_legal_resources")
        .select("id, title, content, category, reference, url")
        .textSearch("tsv", queryText + " coercive control domestic violence", { type: "websearch" })
        .limit(8);

      if (!legalErr && legalRows && legalRows.length) {
        const legalCitations = legalRows.map((legal: any, i: number) => ({
          index: citations.length + i + 1,
          file_id: legal.id,
          file_name: `NSW Legal Resource: ${legal.title}`,
          seq: 1,
          excerpt: `${legal.content} ${legal.reference ? `(Reference: ${legal.reference})` : ''}`,
          meta: { category: legal.category, url: legal.url },
          type: "legal_resource"
        }));
        
        citations = [...citations, ...legalCitations];
        nswLegalContext = legalCitations.map((c) => `[CITATION ${c.index}] ${c.file_name}: ${c.excerpt}`);
        contextBlocks = [...contextBlocks, ...nswLegalContext];
      }
    }

    // Proactive Memory Triggers and Context Enhancement
    let proactiveContext = "";
    let memoryUpdates: any = {};
    
    if (queryText && currentCaseMemory) {
      console.log("🧠 Running proactive memory triggers...");
      
      // Date Detection Trigger
      const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g;
      const dateMatches = queryText.match(dateRegex);
      
      if (dateMatches && currentCaseMemory.timeline_summary?.length > 0) {
        const relevantTimelineEvents = currentCaseMemory.timeline_summary.filter((event: any) => {
          return dateMatches.some(date => {
            const normalizedDate = date.replace(/[\/\-\.]/g, '/');
            return event.date?.includes(normalizedDate.split('/')[0]) || 
                   event.date?.includes(normalizedDate.split('/')[1]) ||
                   event.title?.toLowerCase().includes(date);
          });
        });
        
        if (relevantTimelineEvents.length > 0) {
          proactiveContext += `\n🗓️ **TIMELINE CONTEXT for ${dateMatches.join(', ')}:**\n`;
          relevantTimelineEvents.forEach((event: any, i: number) => {
            proactiveContext += `${i + 1}. ${event.date}: ${event.title} - ${event.fact}\n`;
          });
          proactiveContext += "\n";
        }
      }
      
      // Person Detection Trigger
      const personRegex = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
      const personMatches = queryText.match(personRegex);
      
      if (personMatches && contextBlocks.length > 0) {
        const personAppearances: Record<string, any[]> = {};
        
        contextBlocks.forEach((block, index) => {
          personMatches.forEach(person => {
            if (block.toLowerCase().includes(person.toLowerCase())) {
              if (!personAppearances[person]) personAppearances[person] = [];
              personAppearances[person].push({
                citation: index + 1,
                context: block.slice(0, 200) + "..."
              });
            }
          });
        });
        
        Object.entries(personAppearances).forEach(([person, appearances]) => {
          if (appearances.length > 0) {
            proactiveContext += `\n👤 **${person.toUpperCase()} APPEARANCES:**\n`;
            appearances.slice(-3).forEach((app: any, i: number) => {
              proactiveContext += `${i + 1}. Citation ${app.citation}: ${app.context}\n`;
            });
            proactiveContext += "\n";
          }
        });
      }
      
      // Goal Restatement Detection
      const goalKeywords = ['custody', 'avo', 'divorce', 'court', 'hearing', 'settlement'];
      const hasGoalKeywords = goalKeywords.some(keyword => queryText.toLowerCase().includes(keyword));
      
      if (hasGoalKeywords && queryText.toLowerCase().includes('want') && currentCaseMemory.primary_goal) {
        const newGoalMatch = queryText.match(/want to (.+?)(?:\.|$)/i);
        if (newGoalMatch) {
          const potentialNewGoal = newGoalMatch[1].trim();
          if (potentialNewGoal.length > 10 && !potentialNewGoal.toLowerCase().includes(currentCaseMemory.primary_goal?.toLowerCase() || '')) {
            memoryUpdates.primary_goal = potentialNewGoal;
            memoryUpdates.goal_established_at = new Date().toISOString();
            proactiveContext += `\n🎯 **GOAL UPDATE DETECTED:** Updating from "${currentCaseMemory.primary_goal}" to "${potentialNewGoal}"\n\n`;
          }
        }
      }
    }

    // Evidence Upload Announcements
    let evidenceAnnouncement = "";
    if (hasRecentUploads && newlyProcessedFiles.length > 0) {
      const recentFile = newlyProcessedFiles[0];
      const { data: recentAnalysis } = await supabase
        .from("evidence_comprehensive_analysis")
        .select("key_insights, timeline_significance")
        .eq("file_id", recentFile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (recentAnalysis) {
        evidenceAnnouncement = `\n📈 **NEW EVIDENCE INDEXED:**\nJust processed "${recentFile.name}" and found ${recentAnalysis.key_insights?.length || 0} key insights. ${recentAnalysis.timeline_significance ? `Timeline impact: ${recentAnalysis.timeline_significance}` : ''}\n\n`;
      }
    }
    // Case Strength Monitoring and Updates
    let caseStrengthAnnouncement = "";
    if (currentLegalStrategy && currentCaseMemory) {
      const currentStrength = currentCaseMemory.case_strength_score || 0;
      const legalStrength = currentLegalStrategy.case_strength_overall || 0;
      
      const strengthDiff = Math.abs(legalStrength - currentStrength);
      if (strengthDiff > 3) {
        const direction = legalStrength > currentStrength ? "+" : "-";
        caseStrengthAnnouncement = `\n📊 **CASE STRENGTH UPDATE:** ${Math.round(legalStrength)}% (${direction}${Math.round(strengthDiff)})\n`;
        
        if (currentLegalStrategy.next_steps && Array.isArray(currentLegalStrategy.next_steps)) {
          caseStrengthAnnouncement += `**Boosters:** ${currentLegalStrategy.next_steps.slice(0, 3).map((step: any, i: number) => `(${i + 1}) ${step.action || step}`).join(', ')}\n\n`;
        }
        
        // Update case memory with new strength
        memoryUpdates.case_strength_score = legalStrength;
        memoryUpdates.case_strength_reasons = currentLegalStrategy.strengths || [];
      }
    }

    // Apply memory updates if any
    if (Object.keys(memoryUpdates).length > 0 && currentCaseMemory) {
      try {
        await supabase
          .from("case_memory")
          .update({
            ...memoryUpdates,
            last_updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
        console.log("✅ Case memory updated with:", Object.keys(memoryUpdates));
      } catch (error) {
        console.error("Failed to update case memory:", error);
      }
    }
      const fileNames = newlyProcessedFiles.map(f => f.name).join(', ');
      const chunkCount = totalChunks?.count || 0;
      
      if (analysisTriggered) {
        smartGreeting = `\n\n🔍 **EVIDENCE ANALYSIS COMPLETE**
I've just analyzed your ${fileNames} containing ${chunkCount}+ pieces of evidence. Based on my analysis, I can already identify concerning patterns that appear relevant to NSW coercive control laws. Let me share what I found and how this strengthens your case...`;
      } else if (caseMemory || legalStrategy) {
        smartGreeting = `\n\n📋 **CASE UPDATE**
I can see you've uploaded ${fileNames} with ${chunkCount}+ evidence pieces that I've analyzed. Based on your established case goals and this evidence, I'm ready to provide specific insights about the patterns I've identified and next steps.`;
      } else {
        smartGreeting = `\n\n📁 **SUBSTANTIAL EVIDENCE DETECTED**
I can see you've uploaded ${fileNames} containing ${chunkCount}+ pieces of evidence. This appears to be a significant evidence collection. I'm analyzing it now to identify patterns and legal significance...`;
      }
    } else if (hasRecentUploads) {
      const fileNames = newlyProcessedFiles.slice(0, 3).map(f => f.name).join(', ');
      smartGreeting = `\n\nI can see you've uploaded ${fileNames}${newlyProcessedFiles.length > 3 ? ' and other files' : ''} which I've now indexed and analyzed. Thank you for providing this evidence - I'll reference the specific content from your uploads in my analysis.`;
    }

    // Combine all proactive context
    const fullProactiveContext = proactiveContext + evidenceAnnouncement + caseStrengthAnnouncement;

    // Combine all proactive context
    const fullProactiveContext = proactiveContext + evidenceAnnouncement + caseStrengthAnnouncement;

    // Get updated case memory after potential analysis (including goal tracking)
    const { data: currentCaseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();
      
    const { data: currentLegalStrategy } = await supabase
      .from("legal_strategy")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Goal Detection and Storage Logic
    let goalContext = "";
    let shouldDetectGoal = false;
    
    if (currentCaseMemory?.primary_goal && currentCaseMemory?.goal_status === 'active') {
      // User has an established goal - build continuity
      goalContext = `Building on your goal of ${currentCaseMemory.primary_goal}`;
    } else {
      // Check if user is stating a goal in their message
      const goalKeywords = [
        'custody', 'parenting plan', 'court hearing', 'full custody', 'shared custody',
        'avo', 'restraining order', 'divorce', 'property settlement', 'child support',
        'domestic violence', 'coercive control', 'family law', 'litigation'
      ];
      
      const userMessage = String(prompt || '').toLowerCase();
      const detectedGoal = goalKeywords.find(keyword => userMessage.includes(keyword));
      
      if (detectedGoal || userMessage.includes('prepare for') || userMessage.includes('want to') || userMessage.includes('need to')) {
        // Extract and store potential goal
        let extractedGoal = "";
        if (userMessage.includes('prepare for')) {
          extractedGoal = userMessage.match(/prepare for ([^.!?]+)/i)?.[1]?.trim();
        } else if (userMessage.includes('custody')) {
          extractedGoal = userMessage.includes('full custody') ? 'prepare for full custody hearing' : 'prepare for custody proceedings';
        } else if (userMessage.includes('avo')) {
          extractedGoal = 'apply for an AVO';
        } else if (detectedGoal) {
          extractedGoal = `resolve ${detectedGoal} matter`;
        }
        
        if (extractedGoal) {
          // Store the detected goal
          const { error: goalError } = await supabase
            .from("case_memory")
            .upsert({
              user_id: user.id,
              primary_goal: extractedGoal,
              goal_established_at: new Date().toISOString(),
              goal_status: 'active',
              facts: currentCaseMemory?.facts,
              parties: currentCaseMemory?.parties,
              issues: currentCaseMemory?.issues
            });
            
          if (!goalError) {
            goalContext = `I understand your goal is to ${extractedGoal}. Let me help you with that`;
          }
        }
      } else {
        shouldDetectGoal = true;
      }
    }

    // Enhanced case context with memory-aware summaries
    let caseContext = "";
    if (currentCaseMemory) {
      caseContext = `
=== CASE MEMORY CONTEXT ===
**Primary Goal:** ${currentCaseMemory.primary_goal || 'Not yet established'}
**Goal Status:** ${currentCaseMemory.goal_status || 'unclear'}
**Case Strength:** ${Math.round(currentCaseMemory.case_strength_score || 0)}%

**Key Facts:** ${JSON.stringify(currentCaseMemory.key_facts || [])}
**Recent Thread:** ${currentCaseMemory.thread_summary || 'New conversation'}

**Evidence Index:** ${currentCaseMemory.evidence_index?.length || 0} files processed
${currentCaseMemory.evidence_index?.map((e: any) => `- Exhibit ${e.exhibit_code}: ${e.file_name} (${e.summary})`).join('\n') || ''}

**Timeline Summary:** ${currentCaseMemory.timeline_summary?.length || 0} events tracked
`;
    }
    let caseSummary = "";
    if (comprehensiveAnalysis && comprehensiveAnalysis.length > 0) {
      const latestAnalysis = comprehensiveAnalysis[0];
      const insights = latestAnalysis.key_insights || [];
      const impact = latestAnalysis.case_impact || "";
      
      caseSummary = `Based on your uploaded evidence, I can see:
• ${insights.slice(0, 3).join('\n• ')}

${impact ? `Case Impact: ${impact}` : ''}

Does this look right?`;
    }

    // Create goal-aware system prompts based on mode
    const userModePrompt = `You are Veronica, a warm and supportive NSW legal assistant. ${goalContext ? goalContext + ', here\'s how this evidence helps.' : (shouldDetectGoal ? 'Let me help you focus on your main legal goal.' : '')}

Protocol:
${shouldDetectGoal ? 
  '– Start by asking: "What\'s your main legal goal? For example, preparing for a custody hearing, applying for an AVO, or drafting a parenting plan?"' : 
  '– Never ask "what is your goal?" again - you already know their objective.'
}
– When analyzing new evidence, tie it directly back to their established goal in ≤3 bullet points.
– Add timeline events automatically when dates are found.
– If evidence isn't directly relevant, briefly acknowledge this but suggest a goal-relevant next step.
– Only ask clarifying questions when truly necessary to proceed.
– Keep your tone warm, empathetic, and encouraging. Avoid overwhelming lists.
– Do not include sources or citations unless explicitly requested.

${caseSummary ? `\n\nCASE SUMMARY:\n${caseSummary}` : ''}

**SAFETY FIRST**: If you're in immediate danger, please call 000. Your safety is my top priority.

I'm here to support you, ${userName}.${smartGreeting}`;

    const lawyerModePrompt = `You are Veronica — Lawyer Mode. ${goalContext ? goalContext + ', here\'s the legal analysis.' : (shouldDetectGoal ? 'Let me understand your legal objective first.' : '')}

Protocol:
${shouldDetectGoal ? 
  '– Ask: "What specific legal outcome are you working toward?"' :
  '– Build on the established goal with each response.'
}
– Summarize evidence in ≤3 bullets tied to their legal objective.
– Provide numbered findings based on available evidence.
– Only include exhibits or legal sections if specifically requested.
– Keep answers under 250 words but be precise and lawyer-like.
– Stay professional but warm, never cold.

${caseSummary ? `\n\nCASE SUMMARY:\n${caseSummary}` : ''}

**SAFETY FIRST**: If you're in immediate danger, please call 000. Your safety is my top priority.

I'm here to support you professionally, ${userName}.${smartGreeting}`;

    const baseSystem = {
      role: "system",
      content: mode === 'lawyer' ? lawyerModePrompt : userModePrompt,
    };

    const chatMessages = messages ?? [
      baseSystem,
      ...(evidenceInventory ? [{ role: "system", content: evidenceInventory }] : []),
      ...(contextBlocks.length ? [{ role: "system", content: `Context excerpts:\n${contextBlocks.join("\n\n")}` }] : []),
      { role: "user", content: String(queryText || prompt) },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error", errText);
      return new Response(
        JSON.stringify({ error: "OpenAI request failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content ?? "";

    // Save the conversation to messages table for case memory
    const messagePromise = supabase.from("messages").insert([
      {
        user_id: user.id,
        role: "user",
        content: String(queryText || prompt),
        citations: []
      },
      {
        user_id: user.id,
        role: "assistant", 
        content: generatedText,
        citations: citations
      }
    ]);
    messagePromise.then(({ error }) => error && console.error("Message save error", error));

    return new Response(JSON.stringify({ generatedText, citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in assistant-chat:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
