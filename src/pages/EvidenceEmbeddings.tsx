import { EmbeddingGenerator } from "@/components/evidence/EmbeddingGenerator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";

export default function EvidenceEmbeddings() {
  return (
    <>
      <SEO 
        title="Evidence Embeddings - Generate AI Search Capability"
        description="Generate embeddings for uploaded evidence to enable AI search and analysis"
      />
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Evidence AI Integration</CardTitle>
            <CardDescription>
              Generate embeddings for your uploaded evidence files to enable the AI to search and reference them in responses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This tool will process your uploaded evidence files (emails, police reports, documents) and generate embeddings 
              that allow the AI to find and reference specific evidence when answering your questions.
            </p>
          </CardContent>
        </Card>

        <EmbeddingGenerator />
      </div>
    </>
  );
}