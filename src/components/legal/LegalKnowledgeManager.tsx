import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Upload, Search, Database, Loader2, CheckCircle, XCircle } from "lucide-react";

interface LegalDocument {
  id: string;
  title: string;
  document_type: string;
  jurisdiction: string;
  total_sections: number;
  status: string;
  created_at: string;
}

interface SearchResult {
  id: string;
  section_number: string;
  title: string;
  content: string;
  citation_reference: string;
  legal_concepts: string[];
  document: {
    title: string;
    document_type: string;
    jurisdiction: string;
  };
  relevance_score: number;
}

export function LegalKnowledgeManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"search" | "upload" | "manage">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"keyword" | "semantic" | "hybrid">("hybrid");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    type: "act",
    jurisdiction: "NSW",
    sourceUrl: "",
    content: ""
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-search', {
        body: {
          query: searchQuery,
          searchType,
          jurisdiction: 'NSW'
        }
      });

      if (error) throw error;

      setSearchResults(data.results || []);
      toast({
        title: "Search Complete",
        description: `Found ${data.results?.length || 0} relevant legal sections`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to perform legal search. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.content) {
      toast({
        title: "Missing Information",
        description: "Please provide both document title and content",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-document-processor', {
        body: {
          documentTitle: uploadForm.title,
          documentType: uploadForm.type,
          jurisdiction: uploadForm.jurisdiction,
          sourceUrl: uploadForm.sourceUrl,
          documentContent: uploadForm.content
        }
      });

      if (error) throw error;

      toast({
        title: "Document Processed Successfully",
        description: `${data.title} has been indexed with ${data.sectionsProcessed} sections`,
      });

      // Reset form
      setUploadForm({
        title: "",
        type: "act",
        jurisdiction: "NSW", 
        sourceUrl: "",
        content: ""
      });

      // Refresh documents list
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Unable to process document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const renderSearchTab = () => (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="Search legal knowledge (e.g., coercive control, family law, police powers...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Select value={searchType} onValueChange={(value: "keyword" | "semantic" | "hybrid") => setSearchType(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Keyword</SelectItem>
            <SelectItem value="semantic">Semantic</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {searchResults.map((result) => (
              <Card key={result.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-sm">
                      {result.title} - Section {result.section_number}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {result.document.title} ({result.document.jurisdiction})
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(result.relevance_score * 100)}% relevant
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {result.content.substring(0, 200)}...
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.legal_concepts?.map((concept) => (
                    <Badge key={concept} variant="secondary" className="text-xs">
                      {concept}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {result.citation_reference}
                </p>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  const renderUploadTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Document Title</label>
          <Input
            placeholder="e.g., Family Law Act 1975 (Commonwealth)"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Document Type</label>
          <Select value={uploadForm.type} onValueChange={(value) => setUploadForm({ ...uploadForm, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="act">Act</SelectItem>
              <SelectItem value="regulation">Regulation</SelectItem>
              <SelectItem value="case_law">Case Law</SelectItem>
              <SelectItem value="procedure">Procedure</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Jurisdiction</label>
          <Select value={uploadForm.jurisdiction} onValueChange={(value) => setUploadForm({ ...uploadForm, jurisdiction: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NSW">NSW</SelectItem>
              <SelectItem value="Commonwealth">Commonwealth</SelectItem>
              <SelectItem value="VIC">Victoria</SelectItem>
              <SelectItem value="QLD">Queensland</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Source URL (Optional)</label>
          <Input
            placeholder="https://legislation.nsw.gov.au/..."
            value={uploadForm.sourceUrl}
            onChange={(e) => setUploadForm({ ...uploadForm, sourceUrl: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Content</label>
        <Textarea
          placeholder="Paste the full legal document content here..."
          value={uploadForm.content}
          onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
          className="min-h-48"
        />
      </div>

      <Button onClick={handleUpload} disabled={isUploading} className="w-full">
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Document...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Process Document
          </>
        )}
      </Button>
    </div>
  );

  const renderManageTab = () => (
    <div className="space-y-4">
      <Button onClick={loadDocuments} variant="outline" size="sm">
        <Database className="w-4 h-4 mr-2" />
        Refresh
      </Button>
      
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {doc.document_type} • {doc.jurisdiction} • {doc.total_sections} sections
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.status === 'active' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : doc.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <Badge variant={doc.status === 'active' ? 'default' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <CardTitle>Legal Knowledge Manager</CardTitle>
        </div>
        <CardDescription>
          Search, upload, and manage comprehensive legal knowledge for the AI lawyer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "search" ? "default" : "outline"}
            onClick={() => setActiveTab("search")}
            size="sm"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button
            variant={activeTab === "manage" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("manage");
              loadDocuments();
            }}
            size="sm"
          >
            <Database className="w-4 h-4 mr-2" />
            Manage
          </Button>
        </div>

        <Separator className="mb-6" />

        {activeTab === "search" && renderSearchTab()}
        {activeTab === "upload" && renderUploadTab()}
        {activeTab === "manage" && renderManageTab()}
      </CardContent>
    </Card>
  );
}

export default LegalKnowledgeManager;