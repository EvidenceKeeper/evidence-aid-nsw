import { SEO } from "@/components/SEO";
import { NSWLegalUploader } from "@/components/legal/NSWLegalUploader";

export default function LegalTraining() {
  return (
    <div className="min-h-screen bg-background p-4">
      <SEO 
        title="Legal Training | NSW Legal Evidence Manager" 
        description="Upload and train AI with NSW legal documents including Acts, Regulations, Case Law, and Practice Directions." 
      />
      
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">NSW Legal Document Training</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload NSW legal documents to train Veronica with authoritative legal knowledge. 
            Documents are processed into searchable chunks with citation extraction and legal concept identification.
          </p>
        </div>
        
        <NSWLegalUploader />
      </div>
    </div>
  );
}