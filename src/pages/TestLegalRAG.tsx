import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Gavel, FileText } from "lucide-react";

export default function TestLegalRAG() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const testQuery = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a query to test",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Testing Legal RAG with query:", query);

      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: { 
          prompt: query,
          mode: 'user'
        }
      });

      if (error) throw error;

      setResponse(data);
      toast({
        title: "Success",
        description: "Legal RAG test completed successfully",
      });

    } catch (error) {
      console.error("Legal RAG test failed:", error);
      toast({
        title: "Error", 
        description: `Test failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processLegalDocuments = async () => {
    setIsLoading(true);
    try {
      console.log("Triggering legal document processing...");

      const { data, error } = await supabase.functions.invoke('legal-document-processor', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Legal document processing triggered",
      });

      console.log("Processing result:", data);

    } catch (error) {
      console.error("Document processing failed:", error);
      toast({
        title: "Error",
        description: `Processing failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Legal RAG Pipeline Test</h1>
        <p className="text-muted-foreground">
          Test the enhanced Legal-First RAG system with NSW legal knowledge base
        </p>
      </div>

      <div className="grid gap-6">
        {/* Document Processing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Processing
            </CardTitle>
            <CardDescription>
              Process legal documents from the legal-training bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={processLegalDocuments}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Process Legal Documents
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Legal RAG Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Legal RAG Test
            </CardTitle>
            <CardDescription>
              Test the legal-first retrieval system with a query
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter your legal query here (e.g., 'What are the best interests factors for child custody?')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={() => setQuery("What are the best interests factors for child custody in NSW?")}
                variant="outline"
                size="sm"
              >
                Best Interests Test
              </Button>
              <Button
                onClick={() => setQuery("What are the requirements for an ADVO application?")}
                variant="outline"
                size="sm"
              >
                ADVO Requirements
              </Button>
              <Button
                onClick={() => setQuery("How do I apply for adoption in NSW?")}
                variant="outline"
                size="sm"
              >
                Adoption Process
              </Button>
            </div>

            <Button 
              onClick={testQuery}
              disabled={isLoading || !query.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Gavel className="mr-2 h-4 w-4" />
                  Test Legal RAG
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {response && (
          <Card>
            <CardHeader>
              <CardTitle>Legal RAG Results</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">
                  Readiness: {response.case_readiness_status}
                </Badge>
                <Badge variant="outline">
                  Legal Authorities: {response.legal_authorities_found}
                </Badge>
                <Badge variant="outline">
                  Evidence Chunks: {response.evidence_chunks_found}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Response:</h3>
                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                  {response.response}
                </div>
              </div>

              {response.citations && response.citations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Citations ({response.citations.length}):</h3>
                  <div className="space-y-2">
                    {response.citations.map((citation: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={citation.type === 'legislation' ? 'default' : 'secondary'}>
                            {citation.type}
                          </Badge>
                          <span className="font-medium">{citation.short_citation}</span>
                          {citation.similarity && (
                            <Badge variant="outline">
                              {Math.round(citation.similarity * 100)}% match
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {citation.content.substring(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}