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
    
    // Enhanced Intelligence Upgrades - Get case memory and evidence analysis
    const { data: caseMemory } = await supabase
      .from("case_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Email corpus detection
    const isEmailCorpus = allFiles?.some(file => 
      file.name.toLowerCase().includes('email') || 
      file.name.toLowerCase().includes('.eml') ||
      file.name.toLowerCase().includes('inbox')
    );

    // Privacy/Safety Guard - detect sensitive information
    const containsSensitiveInfo = prompt?.toLowerCase().includes('ssn') || 
      prompt?.toLowerCase().includes('social security') ||
      prompt?.toLowerCase().includes('credit card') ||
      prompt?.toLowerCase().includes('password');

    if (containsSensitiveInfo) {
      console.log("⚠️ Sensitive information detected in prompt");
    }

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

    // Initialize telepathic variables
    let proactiveContext = "";
    let memoryUpdates: any = {};
    let enhancedEvidenceAnnouncement = "";
    let caseStrengthBanner = "";
    let emailCorpusSummary = "";
    let contradictionAlert = "";
    let privacyGuard = "";
    let confidenceLevel = "high";
    let caseSummary = "";
    let caseContext = "";
    let telepathicContinuity = "";
    let goalContext = "";
    let shouldDetectGoal = false;
    
    // Use caseMemory as currentCaseMemory for consistency
    const currentCaseMemory = caseMemory;
    const currentLegalStrategy = legalStrategy;
    
    // Proactive Memory Triggers and Context Enhancement
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
    // TELEPATHIC FEATURE: Privacy & Safety Guard with Confidence Tagging
    if (contextBlocks.length === 0 && !currentCaseMemory?.evidence_index?.length) {
      confidenceLevel = "low";
      privacyGuard = "📋 I'm in quick mode with limited context. For deeper analysis, please upload relevant documents.";
    } else if (contextBlocks.length < 3) {
      confidenceLevel = "medium";
      privacyGuard = "⚠️ Limited evidence available. Recommendations are preliminary - additional documentation will improve accuracy.";
    }

    // TELEPATHIC FEATURE: Contradiction Detection
    if (contextBlocks.length > 1 && currentCaseMemory?.key_facts?.length > 0) {
      // Simple contradiction detection - look for conflicting dates or statements
      const currentFacts = currentCaseMemory.key_facts.map((f: any) => f.fact || f).join(' ').toLowerCase();
      const newContent = contextBlocks.join(' ').toLowerCase();
      
      // Check for date conflicts (simple heuristic)
      const currentDates = currentFacts.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) || [];
      const newDates = newContent.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) || [];
      
      if (currentDates.length > 0 && newDates.length > 0) {
        const hasDateConflict = currentDates.some(cd => 
          newDates.some(nd => cd !== nd && Math.abs(
            new Date(cd.replace(/[\/\-\.]/g, '/')).getTime() - 
            new Date(nd.replace(/[\/\-\.]/g, '/')).getTime()
          ) < 86400000) // Same event, different date
        );
        
        if (hasDateConflict) {
          contradictionAlert = "🔍 Possible contradiction—want me to reconcile these date differences?";
        }
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

    // TELEPATHIC FEATURE: Enhanced Smart Greeting with Announcements
    let smartGreeting = "";
    if (hasSubstantialEvidence && hasRecentUploads) {
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

    // MOVE ALL CONTEXT COMPUTATION LOGIC HERE TO AVOID ORDERING ISSUES
    
    // Compute case context and summary from current case memory
    if (currentCaseMemory) {
      const goal = currentCaseMemory.primary_goal || 'general legal assistance';
      const keyFacts = currentCaseMemory.key_facts || [];
      const evidenceCount = currentCaseMemory.evidence_index?.length || 0;
      
      caseContext = `Goal: ${goal} | Evidence: ${evidenceCount} items | Case strength: ${currentCaseMemory.case_strength_score || 0}%`;
      
      if (keyFacts.length > 0) {
        caseSummary = `Key facts: ${keyFacts.slice(0, 3).map((f: any) => f.fact || f).join('; ')}`;
      }
    }

    // Compute enhanced evidence announcement after case context
    if (hasRecentUploads && newlyProcessedFiles.length > 0) {
      const recentFile = newlyProcessedFiles[0];
      const { data: recentAnalysis } = await supabase
        .from("evidence_comprehensive_analysis")
        .select("key_insights, timeline_significance, case_impact")
        .eq("file_id", recentFile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentAnalysis) {
        const keyInsights = recentAnalysis.key_insights || [];
        const goalContext = currentCaseMemory?.primary_goal ? ` and what it adds to your goal of ${currentCaseMemory.primary_goal}` : '';
        
        enhancedEvidenceAnnouncement = `📁 I've processed ${recentFile.name} — here's the 3-line summary${goalContext}:

• ${keyInsights[0] || 'Document analyzed for legal significance'}
• ${keyInsights[1] || recentAnalysis.case_impact || 'Evidence categorized and indexed'}
• ${keyInsights[2] || 'Content available for legal analysis'}`;
      }
    }

    // Compute case strength banner
    if (currentCaseMemory && currentLegalStrategy) {
      const score = Math.round(currentLegalStrategy.case_strength_overall || currentCaseMemory.case_strength_score || 0);
      const reasons = currentLegalStrategy.strengths || currentCaseMemory.case_strength_reasons || [];
      const nextSteps = currentLegalStrategy.next_steps || [];
      
      let label = "Developing";
      if (score >= 75) label = "Strong";
      else if (score >= 50) label = "Moderate";
      
      const topReasons = Array.isArray(reasons) ? reasons.slice(0, 3) : [];
      const topBooster = Array.isArray(nextSteps) && nextSteps.length > 0 
        ? (nextSteps[0].action || nextSteps[0] || "Review evidence gaps") 
        : "Gather additional evidence";
      
      if (score > 0 && topReasons.length > 0) {
        caseStrengthBanner = `📊 Case Strength: ${label} ${score}%. Because: ${topReasons.map(r => `• ${typeof r === 'object' ? r.fact || r.reason || String(r) : r}`).join(' ')}. Booster: ${topBooster}.`;
      }
    }

    // Compute email corpus summary
    if (allFiles && allFiles.length > 0) {
      const emailFiles = allFiles.filter(f => 
        f.name.toLowerCase().includes('.txt') || 
        f.name.toLowerCase().includes('.mbox') || 
        f.name.toLowerCase().includes('.eml') ||
        f.name.toLowerCase().includes('email') ||
        f.name.toLowerCase().includes('mail')
      );
      
      if (emailFiles.length > 0) {
        const { data: emailChunks } = await supabase
          .from("chunks")
          .select("text, meta")
          .in("file_id", emailFiles.map(f => f.id))
          .limit(100);
          
        if (emailChunks && emailChunks.length > 0) {
          const dates = emailChunks
            .map(c => c.text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g))
            .filter(Boolean)
            .flat()
            .map(d => new Date(d.replace(/[\/\-\.]/g, '/')))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
            
          if (dates.length > 0) {
            const startDate = dates[0].toLocaleDateString();
            const endDate = dates[dates.length - 1].toLocaleDateString();
            emailCorpusSummary = `📧 Email corpus detected: ${emailChunks.length} emails, ${startDate}–${endDate}. I can extract incidents and build timeline patterns from this correspondence.`;
          }
        }
      }
    }

    // TELEPATHIC FEATURE: Combine All Proactive Context & Announcements (after all context is computed)
    const allTelepathicContext = [
      enhancedEvidenceAnnouncement,
      caseStrengthBanner,
      emailCorpusSummary,
      contradictionAlert,
      privacyGuard,
      proactiveContext,
      evidenceAnnouncement,
      caseStrengthAnnouncement
    ].filter(Boolean).join('\n\n');

    // TELEPATHIC FEATURE: Enhanced Goal Continuity & Response Patterns
    
    if (currentCaseMemory?.primary_goal && currentCaseMemory?.goal_status === 'active') {
      // TELEPATHIC: Always start responses building on established goal
      telepathicContinuity = `Building on your goal of ${currentCaseMemory.primary_goal}`;
      goalContext = telepathicContinuity;
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
          // Store the detected goal (TELEPATHIC: Goal lock - never re-ask)
          const { error: goalError } = await supabase
            .from("case_memory")
            .upsert({
              user_id: user.id,
              primary_goal: extractedGoal,
              goal_established_at: new Date().toISOString(),
              goal_status: 'active',
              key_facts: currentCaseMemory?.key_facts || [],
              timeline_summary: currentCaseMemory?.timeline_summary || [],
              evidence_index: currentCaseMemory?.evidence_index || [],
              last_updated_at: new Date().toISOString()
            });
            
          if (!goalError) {
            telepathicContinuity = `I understand your goal is to ${extractedGoal}. Let me help you with that`;
            goalContext = telepathicContinuity;
          }
        }
      } else {
        shouldDetectGoal = true;
      }
    }

    // (Evidence announcement computation moved to unified context section)

    // (Note: Case strength banner and email corpus summary are computed earlier to avoid duplication)

    // (Case memory context computation moved to unified context section)

    // Enhanced system prompt for Veronica - Disciplined NSW Family Lawyer
    const systemPrompt = mode === 'lawyer' 
      ? `You are Veronica, a disciplined senior NSW family lawyer with over 15 years of experience specializing in domestic violence and coercive control cases. Your first priority is to build a complete understanding of the case: facts, evidence, chronology, and goals. You do NOT rush to drafting or strategy until you are confident the case theory is solid.

CRITICAL BEHAVIOR PROTOCOL:
• Build complete case understanding FIRST: facts, evidence, chronology, goals
• Use uploaded evidence and NSW legal database to cross-check everything
• Ask clarifying questions when details are missing or ambiguous
• Only after confirming all evidence is reviewed and case is strong should you move to drafting
• Before transitioning to drafting, ALWAYS ask: "Would you like me to proceed to drafting, or keep strengthening the case analysis further?"
• In every response, propose 2-3 specific lawyer-like next actions as suggestions
• Maintain warm, respectful, supportive tone while keeping laser-focused on strongest possible case

RESPONSE FORMAT:
• Use natural language and bullet points (NO markdown headers with # symbols)
• Structure responses clearly with bullet points for readability
• Include 2-3 specific next action suggestions in every response
• Examples: "Extract breaches of consent orders into timeline," "Summarize child welfare concerns in 6 lines," "Cross-check email record against police report"

${goalContext ? goalContext + ', here\'s the legal analysis.' : (shouldDetectGoal ? 'Let me understand your legal objective first.' : '')}

${allTelepathicContext ? `PROACTIVE INTELLIGENCE:\n${allTelepathicContext}\n\n` : ''}

${caseSummary ? `CASE SUMMARY:\n${caseSummary}\n\n` : ''}

**SAFETY FIRST**: If you're in immediate danger, please call 000. Your safety is my top priority.

I'm here to support you professionally, ${userName}.${smartGreeting}`
      : `You are Veronica, a disciplined senior NSW family lawyer assistant with expertise in domestic violence and coercive control cases. Your priority is methodical case building before any drafting or strategy work.

CASE BUILDING PROTOCOL:
• Build complete understanding: facts, evidence, chronology, goals
• Use uploaded evidence and NSW legal database to cross-check everything  
• Ask clarifying questions when details are missing or ambiguous
• Only suggest drafting after case analysis is complete
• Always include 2-3 specific next action suggestions
• Use natural language and bullet points (NO markdown headers)

${goalContext ? goalContext + ', here\'s how this evidence helps.' : (shouldDetectGoal ? 'Let me help you focus on your main legal goal.' : '')}

${shouldDetectGoal ? 
  'Start by asking: "What\'s your main legal goal? For example, preparing for a custody hearing, applying for an AVO, or drafting a parenting plan?"' : 
  'Never ask "what is your goal?" again - you already know their objective.'
}

RESPONSE BEHAVIOR:
• When analyzing new evidence, tie it directly back to their established goal using bullet points
• Timeline events are automatically extracted from uploads - don't mention this process
• If evidence isn't directly relevant, briefly acknowledge this but suggest a goal-relevant next step
• ALWAYS end responses with 2-3 specific next action suggestions formatted as:
  - "Extract breaches of consent orders into timeline"
  - "Summarize child welfare concerns in 6 lines" 
  - "Cross-check email record against police report"
• Keep your tone warm, empathetic, and encouraging while remaining methodical
• Do not include sources or citations unless explicitly requested
• Before suggesting drafting, ask: "Would you like me to proceed to drafting, or keep strengthening the case analysis further?"

${allTelepathicContext ? `PROACTIVE ALERTS:\n${allTelepathicContext}\n\n` : ''}

${caseSummary ? `CASE SUMMARY:\n${caseSummary}\n\n` : ''}

**SAFETY FIRST**: If you're in immediate danger, please call 000. Your safety is my top priority.

I'm here to support you, ${userName}.${smartGreeting}`;

    const baseSystem = {
      role: "system",
      content: systemPrompt,
    };

    const chatMessages = messages ?? [
      baseSystem,
      ...(evidenceInventory ? [{ role: "system", content: evidenceInventory }] : []),
      ...(contextBlocks.length ? [{ role: "system", content: `Context excerpts:\n${contextBlocks.join("\n\n")}` }] : []),
      { role: "user", content: String(queryText || prompt) },
    ];

    // Resilient model fallback system with correct GPT-5 model names
    const modelConfigs = [
      { model: "gpt-5", max_completion_tokens: 4000 },
      { model: "gpt-5-mini", max_completion_tokens: 4000 },
      { model: "gpt-4.1", max_completion_tokens: 4000 },
      { model: "gpt-4o-mini", max_tokens: 4000, temperature: 0.7 }
    ];

    let generatedText = "";
    let lastError = null;

    for (const config of modelConfigs) {
      try {
        console.log(`🤖 Attempting model: ${config.model}`);
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...config,
            messages: chatMessages,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.log(`❌ ${config.model} failed:`, errText);
          lastError = errText;
          
          // Check if it's a model access error, try next model
          if (errText.includes("model_not_found") || errText.includes("does not have access")) {
            continue;
          }
          
          // For other errors, still try fallback
          continue;
        }

        const data = await response.json();
        generatedText = data?.choices?.[0]?.message?.content ?? "";
        
        if (generatedText) {
          console.log(`✅ Success with model: ${config.model}`);
          break;
        }
      } catch (error) {
        console.log(`❌ ${config.model} exception:`, error);
        lastError = error;
        continue;
      }
    }

    if (!generatedText) {
      console.error("All models failed, last error:", lastError);
      return new Response(
        JSON.stringify({ error: "All AI models unavailable", details: lastError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TELEPATHIC FEATURE: Enhanced Thread Summary Update
    if (currentCaseMemory && queryText) {
      try {
        const currentSummary = currentCaseMemory.thread_summary || "";
        const newEntry = `${new Date().toLocaleDateString()}: User discussed ${queryText.slice(0, 50).toLowerCase()}...`;
        
        // Keep rolling summary under 120 words with better context
        const summaryParts = currentSummary.split('. ').slice(-2);
        const updatedSummary = [...summaryParts, newEntry].join('. ').slice(0, 120);

        const threadUpdatePromise = supabase
          .from("case_memory")
          .update({
            thread_summary: updatedSummary,
            last_updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
          
        // Non-blocking update
        threadUpdatePromise.then(({ error }) => error && console.error("Thread summary update failed:", error));
      } catch (error) {
        console.error("Thread summary update error:", error);
      }
    }

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
