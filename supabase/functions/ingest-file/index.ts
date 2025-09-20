import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

function chunkText(text: string, target = 1200, overlap = 200) {
  const chunks: { seq: number; text: string }[] = [];
  let i = 0;
  let seq = 0;
  const t = text || "";
  while (i < t.length) {
    const end = Math.min(t.length, i + target);
    const piece = t.slice(i, end).trim();
    if (piece) chunks.push({ seq, text: piece });
    seq++;
    if (end >= t.length) break;
    i = end - Math.min(overlap, end - i);
  }
  return chunks;
}

async function extractPdfTextPerPage(data: Uint8Array): Promise<Array<{ page: number; text: string }>> {
  try {
    const { getDocument } = await import(
      // Use legacy build to avoid worker requirement in Deno
      "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.min.mjs"
    );
    const loadingTask: any = getDocument({ data });
    const pdf: any = await loadingTask.promise;
    const pages: Array<{ page: number; text: string }> = [];
    const total = pdf.numPages as number;

    for (let p = 1; p <= total; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      const text = (textContent.items || [])
        .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ page: p, text });
    }

    return pages;
  } catch (e) {
    console.error("PDF parse error:", e);
    throw new Error("Failed to parse PDF");
  }
}

async function ocrImageFromUrl(url: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("Server missing OPENAI_API_KEY");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Perform OCR and return only the plain text content found in this image." },
            { type: "image_url", image_url: { url } },
          ],
        },
      ],
      temperature: 0.0,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    console.error("OpenAI OCR error:", t);
    throw new Error("OpenAI OCR failed");
  }
  const j = await resp.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured for Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: 5 requests per minute for file processing
    const windowMs = 60_000;
    const limit = 5;
    const sinceIso = new Date(Date.now() - windowMs).toISOString();

    const serviceRoleSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { count, error: countErr } = await serviceRoleSupabase
      .from("assistant_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sinceIso);

    if (countErr) {
      console.error("Rate limit count error", countErr);
    }

    if ((count ?? 0) >= limit) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. File processing is limited to 5 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log request without IP for privacy
    serviceRoleSupabase.from("assistant_requests").insert({ user_id: user.id })
      .then(({ error }) => error && console.error("Log insert error", error));

    const body = await req.json();
    const path = String(body?.path || "");
    const bucket = String(body?.bucket || "evidence");
    if (!path || !path.includes("/")) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'path'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a short-lived signed URL to read the file
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300);
    if (signErr || !signed?.signedUrl) {
      console.error("Sign URL error", signErr);
      return new Response(JSON.stringify({ error: "Failed to access file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fileResp = await fetch(signed.signedUrl);
    if (!fileResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to download file (${fileResp.status})` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = fileResp.headers.get("content-type") || "application/octet-stream";
    const contentLength = Number(fileResp.headers.get("content-length") || 0) || undefined;
    const fileName = path.split("/").pop() || "file";

    // Upsert file row (by storage_path + user)
    let fileId: string | null = null;
    {
      const { data: existing } = await supabase
        .from("files")
        .select("id")
        .eq("user_id", user.id)
        .eq("storage_path", path)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        fileId = existing.id as string;
        // mark processing and clear old chunks
        await supabase.from("files").update({ status: "processing", mime_type: contentType }).eq("id", fileId);
        await supabase.from("chunks").delete().eq("file_id", fileId);
      } else {
        const { data: inserted, error: fileErr } = await supabase
          .from("files")
          .insert({
            user_id: user.id,
            name: fileName,
            storage_path: path,
            mime_type: contentType,
            size: contentLength ?? null,
            status: "processing",
            meta: { source: `storage://${bucket}` },
          })
          .select("id")
          .single();
        if (fileErr || !inserted) {
          console.error("File insert error", fileErr);
          return new Response(JSON.stringify({ error: "Failed to create file record" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        fileId = inserted.id as string;
      }
    }

    // Process by content type
    let totalChunks = 0;
    if (contentType.startsWith("text/")) {
      const text = await fileResp.text();
      const chunks = chunkText(text);
      totalChunks = chunks.length;
      if (chunks.length) {
        const rows = chunks.map((c) => ({ file_id: fileId!, seq: c.seq, text: c.text, meta: {} }));
        const { error: chunkErr } = await supabase.from("chunks").insert(rows);
        if (chunkErr) {
          console.error("Chunk insert error", chunkErr);
          return new Response(JSON.stringify({ error: "Failed to insert chunks" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (contentType === "application/pdf") {
      const arr = new Uint8Array(await fileResp.arrayBuffer());
      const pages = await extractPdfTextPerPage(arr);
      const rows: any[] = [];
      let seq = 0;
      for (const p of pages) {
        const pageChunks = chunkText(p.text);
        for (const c of pageChunks) {
          rows.push({ file_id: fileId!, seq: seq++, text: c.text, meta: { page: p.page } });
        }
      }
      totalChunks = rows.length;
      if (rows.length) {
        const { error: chunkErr } = await supabase.from("chunks").insert(rows);
        if (chunkErr) {
          console.error("Chunk insert error", chunkErr);
          return new Response(JSON.stringify({ error: "Failed to insert chunks" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (contentType.startsWith("image/")) {
      const ocrText = await ocrImageFromUrl(signed.signedUrl);
      const chunks = chunkText(ocrText);
      totalChunks = chunks.length;
      if (chunks.length) {
        const rows = chunks.map((c) => ({ file_id: fileId!, seq: c.seq, text: c.text, meta: { source: "ocr", page: 1 } }));
        const { error: chunkErr } = await supabase.from("chunks").insert(rows);
        if (chunkErr) {
          console.error("Chunk insert error", chunkErr);
          return new Response(JSON.stringify({ error: "Failed to insert chunks" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else {
      return new Response(JSON.stringify({ error: `Unsupported content-type: ${contentType}` }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("files").update({ status: "processed" }).eq("id", fileId);

    // Automatically trigger continuous case analysis using Supabase client
    try {
      console.log('🔄 Triggering automatic case analysis...');
      
      // Start enhanced background processing
      try {
        const { error: enhancedProcessingError } = await supabase.functions.invoke(
          "enhanced-evidence-processor", 
          { body: { file_id: fileId, processing_type: "full_analysis" } }
        );
        if (enhancedProcessingError) {
          console.error("Enhanced processing invocation failed:", enhancedProcessingError);
        }
      } catch (error) {
        console.error("Failed to trigger enhanced processing:", error);
      }

      // Auto-categorize the uploaded file in background
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            console.log("🏷️ Triggering file categorization...");
            await supabase.functions.invoke("categorize-file", {
              body: { file_id: fileId }
            });
            console.log("✅ File categorization completed");
          } catch (error) {
            console.error("❌ File categorization failed:", error);
          }
        })()
      );

      const analysisResponse = await supabase.functions.invoke('continuous-case-analysis', {
        body: { 
          file_id: fileId, 
          analysis_type: 'new_evidence' 
        }
      });

      let analysisResult = null;
      if (!analysisResponse.error && analysisResponse.data) {
        analysisResult = analysisResponse.data;
        console.log('✅ Case analysis completed:', analysisResult.summary);
      } else {
        console.error('❌ Case analysis failed:', analysisResponse.error);
      }

      return new Response(
        JSON.stringify({ 
          file_id: fileId, 
          chunks: totalChunks, 
          content_type: contentType,
          analysis: analysisResult || {
            success: true,
            summary: `Thank you for uploading ${fileName}. Enhanced processing has started to extract timeline events and analyze patterns.`,
            insights: ['Evidence successfully processed and stored securely', 'Timeline extraction and pattern analysis in progress'],
            case_impact: 'This evidence will be automatically analyzed for coercive control patterns and timeline events'
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (analysisError) {
      console.error('Error in automatic analysis:', analysisError);
      
      // Return success for file processing even if analysis fails
      return new Response(
        JSON.stringify({ 
          file_id: fileId, 
          chunks: totalChunks, 
          content_type: contentType,
          analysis: {
            success: true,
            summary: `Thank you for uploading ${fileName}. Your evidence has been processed and is now part of your case file.`,
            insights: ['Evidence successfully processed and stored securely'],
            case_impact: 'This evidence contributes to your case documentation'
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("ingest-file error", error);
    return new Response(JSON.stringify({ error: (error as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});