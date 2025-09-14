import { SEO } from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NSWLegalAssistant from "@/components/legal/NSWLegalAssistant";
import EnhancedLegalSearch from "@/components/legal/EnhancedLegalSearch";
import PoliceProcessNavigator from "@/components/legal/PoliceProcessNavigator";
import LegalKnowledgeManager from "@/components/legal/LegalKnowledgeManager";

export default function LegalAssistant() {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="NSW Legal Assistant | AI-Powered Legal Guidance" 
        description="Get NSW-specific legal guidance with citation-grounded responses, evidence integration, and step-by-step court process guides." 
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">NSW Legal Assistant</h1>
          <p className="text-muted-foreground">
            Comprehensive NSW legal guidance with RAG-powered responses, evidence integration, and process navigation
          </p>
        </div>

        <Tabs defaultValue="assistant" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
            <TabsTrigger value="search">Legal Search</TabsTrigger>
            <TabsTrigger value="process">Process Guide</TabsTrigger>
            <TabsTrigger value="manage">Knowledge Base</TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="mt-6">
            <NSWLegalAssistant />
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <EnhancedLegalSearch />
          </TabsContent>

          <TabsContent value="process" className="mt-6">
            <PoliceProcessNavigator />
          </TabsContent>

          <TabsContent value="manage" className="mt-6">
            <LegalKnowledgeManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}