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
  const [citations, setCitations] = useState<Array<{ index: number; file_id: string; file_name: string; seq: number; excerpt: string; meta: any }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const ask = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setAnswer(null);
    setCitations([]);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-chat", {
        body: { prompt: input.trim() },
      });
      if (error) {
        const msg = String(error.message ?? "");
        if (msg.toLowerCase().includes("rate limit")) {
          toast({ title: "Too many requests", description: "Please wait a minute and try again.", variant: "destructive" });
        } else if (msg.toLowerCase().includes("unauthorized")) {
          toast({ title: "Please sign in", description: "Login is required to use the assistant.", variant: "destructive" });
        } else {
          toast({ title: "Request failed", description: msg || "Unexpected error", variant: "destructive" });
        }
        return;
      }
      setAnswer(data?.generatedText || "");
      setCitations(Array.isArray(data?.citations) ? data.citations : []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Legal Assistant | NSW Legal Evidence Manager" description="Ask grounded questions about your documents and NSW sources with citations." />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Legal Assistant</h1>
      <p className="text-muted-foreground mb-6">Chat with an NSW-focused legal assistant. Not legal advice.</p>

      <section aria-label="Ask a legal question" className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ask a question</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your situation or question (NSW)."
              className="min-h-32"
            />
            <div className="flex justify-end">
              <Button onClick={ask} disabled={loading}>
                {loading ? "Thinking..." : "Ask"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {answer !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Assistant response</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {answer}
              </article>

              {citations.length > 0 && (
                <section aria-label="Citations" className="rounded-md border p-3 bg-muted/30">
                  <h3 className="text-sm font-medium mb-2">Citations</h3>
                  <ul className="space-y-2">
                    {citations.map((c) => (
                      <li key={`${c.file_id}-${c.seq}`} className="text-sm">
                        <span className="font-medium">[{c.index}] {c.file_name}#{c.seq}</span>
                        <span className="text-muted-foreground"> — {c.excerpt}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
