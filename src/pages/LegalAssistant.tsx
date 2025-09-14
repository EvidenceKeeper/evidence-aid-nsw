import { SEO } from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NSWLegalAssistant from "@/components/legal/NSWLegalAssistant";
import EnhancedLegalSearch from "@/components/legal/EnhancedLegalSearch";
import PoliceProcessNavigator from "@/components/legal/PoliceProcessNavigator";
import LegalKnowledgeManager from "@/components/legal/LegalKnowledgeManager";
import ContentIngestionManager from "@/components/legal/ContentIngestionManager";
import EvidenceLegalConnector from "@/components/evidence/EvidenceLegalConnector";
import PersonalKnowledgeGraph from "@/components/visualization/PersonalKnowledgeGraph";
import CaseOverviewDashboard from "@/components/case/CaseOverviewDashboard";

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

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="assistant">AI Assistant</TabsTrigger>
            <TabsTrigger value="search">Legal Search</TabsTrigger>
            <TabsTrigger value="process">Process Guide</TabsTrigger>
            <TabsTrigger value="ingest">Content Pipeline</TabsTrigger>
            <TabsTrigger value="manage">Knowledge Base</TabsTrigger>
            <TabsTrigger value="evidence">Evidence Links</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Graph</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <CaseOverviewDashboard />
          </TabsContent>

          <TabsContent value="assistant" className="mt-6">
            <NSWLegalAssistant />
          </TabsContent>

          <TabsContent value="search" className="mt-6">
            <EnhancedLegalSearch />
          </TabsContent>

          <TabsContent value="process" className="mt-6">
            <PoliceProcessNavigator />
          </TabsContent>

          <TabsContent value="ingest" className="mt-6">
            <ContentIngestionManager />
          </TabsContent>

            <TabsContent value="manage" className="mt-6">
              <LegalKnowledgeManager />
            </TabsContent>

            <TabsContent value="evidence" className="mt-6">
              <EvidenceLegalConnector />
            </TabsContent>

            <TabsContent value="knowledge" className="mt-6">
              <PersonalKnowledgeGraph />
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}