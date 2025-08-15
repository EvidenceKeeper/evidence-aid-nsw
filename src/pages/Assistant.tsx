import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
export default function Assistant() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Array<{
    index: number;
    file_id: string;
    file_name: string;
    seq: number;
    excerpt: string;
    meta: any;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const {
    toast
  } = useToast();
  const openCitation = async (c: {
    file_id: string;
    meta?: any;
  }) => {
    try {
      const {
        data: fileData,
        error: fileErr
      } = await supabase.from("files").select("storage_path, mime_type, name").eq("id", c.file_id).single();
      if (fileErr || !fileData?.storage_path) throw fileErr ?? new Error("File not found");
      const {
        data: signed,
        error: signErr
      } = await supabase.storage.from("evidence").createSignedUrl(String(fileData.storage_path), 300);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("Failed to create signed URL");
      const page = Number(c?.meta?.page || 1);
      const url = fileData.mime_type === "application/pdf" ? `${signed.signedUrl}#page=${page}` : signed.signedUrl;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("Open citation failed", e);
      toast({
        title: "Unable to open citation",
        description: e?.message ?? "Unknown error",
        variant: "destructive"
      });
    }
  };
  const ask = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setAnswer(null);
    setCitations([]);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("assistant-chat", {
        body: {
          prompt: input.trim()
        }
      });
      if (error) {
        const msg = String(error.message ?? "");
        if (msg.toLowerCase().includes("rate limit")) {
          toast({
            title: "Too many requests",
            description: "Please wait a minute and try again.",
            variant: "destructive"
          });
        } else if (msg.toLowerCase().includes("unauthorized")) {
          toast({
            title: "Please sign in",
            description: "Login is required to use the assistant.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Request failed",
            description: msg || "Unexpected error",
            variant: "destructive"
          });
        }
        return;
      }
      const text = data?.generatedText || "";
      const cites = Array.isArray(data?.citations) ? data.citations : [];
      setAnswer(text);
      setCitations(cites);

      // Persist messages (best-effort)
      const {
        data: sessionData
      } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (uid) {
        const inserts = [{
          user_id: uid,
          role: "user",
          content: input.trim()
        }, {
          user_id: uid,
          role: "assistant",
          content: text,
          citations: cites
        }];
        const {
          error: insertErr
        } = await supabase.from("messages").insert(inserts);
        if (insertErr) console.warn("message insert failed", insertErr);
      }
    } finally {
      setLoading(false);
    }
  };
  return <div className="container mx-auto px-6 py-8">
      <SEO title="NSW Coercive Control Legal Assistant | Evidence Manager" description="Specialized NSW legal assistant for coercive control cases with evidence analysis and legal guidance." />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Hi, I am Veronica, your Legal Assistant</h1>
      <p className="text-muted-foreground mb-4">I Specialize in legal assistant for NSW Family Law, Parenting plans and Domestic Violence.. Upload all your evidence and I will Analyzes your evidence and provide NSW-specific legal guidance.</p>
      
      

      

      <section aria-label="Ask a legal question" className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ask about your NSW coercive control case</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Ask me to: analyze your evidence patterns • establish your legal goals • explain NSW coercive control laws • provide strategic next steps • teach you about court procedures..." className="min-h-32" />
            <div className="flex justify-end">
              <Button onClick={ask} disabled={loading}>
                {loading ? "Thinking..." : "Ask"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {answer !== null && <Card>
            <CardHeader>
              <CardTitle>NSW Legal Analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {answer}
              </article>

              {citations.length > 0 && <section aria-label="Citations" className="rounded-md border p-3 bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">Citations</h3>
                  <ul className="space-y-2">
                    {citations.map(c => <li key={`${c.file_id}-${c.seq}`} className="text-sm">
                        <button onClick={() => openCitation(c)} className="underline underline-offset-2 hover:no-underline">
                          <span className="font-medium">[{c.index}] {c.file_name}#{c.seq}</span>
                        </button>
                        <span className="text-muted-foreground"> — {c.excerpt}</span>
                      </li>)}
                  </ul>
                </section>}
            </CardContent>
          </Card>}
      </section>
    </div>;
}