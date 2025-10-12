import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Link, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Database,
  Zap,
  Settings,
  Download
} from 'lucide-react';

interface IngestionJob {
  id: string;
  title: string;
  source_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  chunks_created: number;
  citations_extracted: number;
  legal_concepts: string[];
  created_at: string;
  error_message?: string;
}

interface IngestionConfig {
  chunk_size: number;
  overlap: number;
  respect_boundaries: boolean;
  auto_citations: boolean;
  quality_threshold: number;
}

export default function ContentIngestionManager() {
  const [activeTab, setActiveTab] = useState<'url' | 'manual' | 'bulk' | 'jobs'>('url');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [config, setConfig] = useState<IngestionConfig>({
    chunk_size: 1000,
    overlap: 100,
    respect_boundaries: true,
    auto_citations: true,
    quality_threshold: 0.8
  });
  
  const [urlForm, setUrlForm] = useState({
    url: '',
    title: '',
    document_type: '',
    jurisdiction: 'NSW',
    source_authority: '',
    effective_date: '',
    tags: ''
  });

  const [manualForm, setManualForm] = useState({
    title: '',
    content: '',
    document_type: '',
    jurisdiction: 'NSW',
    source_authority: '',
    effective_date: '',
    tags: ''
  });

  const { toast } = useToast();

  const documentTypes = [
    'legislation', 'case_law', 'practice_direction', 'regulation', 'rule', 'guidance'
  ];

  const approvedSources = [
    'legislation.nsw.gov.au - NSW Legislation',
    'austlii.edu.au - Australasian Legal Information Institute',
    'fcfcoa.gov.au - Federal Circuit and Family Court',
    'supremecourt.nsw.gov.au - NSW Supreme Court',
    'districtcourt.nsw.gov.au - NSW District Court',
    'localcourt.nsw.gov.au - NSW Local Court'
  ];

  const handleUrlIngestion = async () => {
    if (!urlForm.url || !urlForm.title || !urlForm.document_type) {
      toast({
        title: "Missing Information",
        description: "Please provide URL, title, and document type.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nsw-legal-ingestor', {
        body: {
          source_type: urlForm.document_type as any,
          source_url: urlForm.url,
          metadata: {
            title: urlForm.title,
            jurisdiction: urlForm.jurisdiction,
            document_type: urlForm.document_type,
            source_authority: urlForm.source_authority,
            effective_date: urlForm.effective_date || undefined,
            tags: urlForm.tags ? urlForm.tags.split(',').map(t => t.trim()) : []
          },
          chunk_config: {
            chunk_size: config.chunk_size,
            overlap: config.overlap,
            respect_boundaries: config.respect_boundaries
          }
        }
      });

      if (error) throw error;

      const newJob: IngestionJob = {
        id: data.document_id,
        title: urlForm.title,
        source_type: urlForm.document_type,
        status: data.status === 'completed' ? 'completed' : 'failed',
        progress: 100,
        chunks_created: data.chunks_created,
        citations_extracted: data.citations_extracted,
        legal_concepts: data.legal_concepts_identified,
        created_at: new Date().toISOString()
      };

      setJobs(prev => [newJob, ...prev]);

      toast({
        title: "Ingestion Completed",
        description: `Successfully processed: ${data.chunks_created} chunks, ${data.citations_extracted} citations`,
      });

      // Reset form
      setUrlForm({
        url: '',
        title: '',
        document_type: '',
        jurisdiction: 'NSW',
        source_authority: '',
        effective_date: '',
        tags: ''
      });

    } catch (error) {
      console.error('Ingestion error:', error);
      toast({
        title: "Ingestion Failed",
        description: error.message || "Failed to process legal document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualIngestion = async () => {
    if (!manualForm.title || !manualForm.content || !manualForm.document_type) {
      toast({
        title: "Missing Information",
        description: "Please provide title, content, and document type.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nsw-legal-ingestor', {
        body: {
          source_type: 'manual',
          content: manualForm.content,
          metadata: {
            title: manualForm.title,
            jurisdiction: manualForm.jurisdiction,
            document_type: manualForm.document_type,
            source_authority: manualForm.source_authority,
            effective_date: manualForm.effective_date || undefined,
            tags: manualForm.tags ? manualForm.tags.split(',').map(t => t.trim()) : []
          },
          chunk_config: {
            chunk_size: config.chunk_size,
            overlap: config.overlap,
            respect_boundaries: config.respect_boundaries
          }
        }
      });

      if (error) throw error;

      const newJob: IngestionJob = {
        id: data.document_id,
        title: manualForm.title,
        source_type: 'manual',
        status: data.status === 'completed' ? 'completed' : 'failed',
        progress: 100,
        chunks_created: data.chunks_created,
        citations_extracted: data.citations_extracted,
        legal_concepts: data.legal_concepts_identified,
        created_at: new Date().toISOString()
      };

      setJobs(prev => [newJob, ...prev]);

      toast({
        title: "Manual Ingestion Completed",
        description: `Successfully processed: ${data.chunks_created} chunks, ${data.citations_extracted} citations`,
      });

      // Reset form
      setManualForm({
        title: '',
        content: '',
        document_type: '',
        jurisdiction: 'NSW',
        source_authority: '',
        effective_date: '',
        tags: ''
      });

    } catch (error) {
      console.error('Manual ingestion error:', error);
      toast({
        title: "Ingestion Failed",
        description: error.message || "Failed to process manual content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>NSW Legal Content Ingestion</span>
          </CardTitle>
          <CardDescription>
            Automated pipeline for processing NSW legal documents with citation extraction
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="url">URL Ingestion</TabsTrigger>
          <TabsTrigger value="manual">Manual Content</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Processing</TabsTrigger>
          <TabsTrigger value="jobs">Ingestion Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Link className="h-4 w-4" />
                  <span>URL-Based Ingestion</span>
                </CardTitle>
                <CardDescription>
                  Fetch and process legal documents from approved NSW sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Source URL</Label>
                  <Input
                    placeholder="https://legislation.nsw.gov.au/view/html/inforce/current/act-2007-080"
                    value={urlForm.url}
                    onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Document Title</Label>
                  <Input
                    placeholder="Crimes (Domestic and Personal Violence) Act 2007"
                    value={urlForm.title}
                    onChange={(e) => setUrlForm({ ...urlForm, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Document Type</Label>
                    <Select value={urlForm.document_type} onValueChange={(value) => setUrlForm({ ...urlForm, document_type: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Jurisdiction</Label>
                    <Select value={urlForm.jurisdiction} onValueChange={(value) => setUrlForm({ ...urlForm, jurisdiction: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="Commonwealth">Commonwealth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Source Authority</Label>
                  <Input
                    placeholder="NSW Parliamentary Counsel's Office"
                    value={urlForm.source_authority}
                    onChange={(e) => setUrlForm({ ...urlForm, source_authority: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    placeholder="domestic violence, AVO, criminal law"
                    value={urlForm.tags}
                    onChange={(e) => setUrlForm({ ...urlForm, tags: e.target.value })}
                  />
                </div>

                <Button onClick={handleUrlIngestion} disabled={loading} className="w-full">
                  {loading ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {loading ? 'Processing...' : 'Ingest Document'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approved Sources</CardTitle>
                <CardDescription>
                  Authorized NSW legal document sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {approvedSources.map((source, idx) => (
                    <div key={idx} className="flex items-center space-x-2 p-2 bg-muted rounded text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                      <span>{source}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Manual Content Entry</span>
              </CardTitle>
              <CardDescription>
                Directly input legal content for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Document Title</Label>
                <Input
                  placeholder="Document title"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Content</Label>
                <Textarea
                  placeholder="Paste the legal document content here..."
                  className="min-h-[200px]"
                  value={manualForm.content}
                  onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Document Type</Label>
                  <Select value={manualForm.document_type} onValueChange={(value) => setManualForm({ ...manualForm, document_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Source Authority</Label>
                  <Input
                    placeholder="Source authority"
                    value={manualForm.source_authority}
                    onChange={(e) => setManualForm({ ...manualForm, source_authority: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleManualIngestion} disabled={loading} className="w-full">
                {loading ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {loading ? 'Processing...' : 'Process Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Bulk Processing</span>
              </CardTitle>
              <CardDescription>
                Process multiple documents from approved sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Core NSW Legal Documents</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Pre-configured batch of essential NSW legal documents for the RAG system
                </p>
                <div className="space-y-2">
                  {[
                    'Crimes (Domestic and Personal Violence) Act 2007 (NSW)',
                    'Family Law Act 1975 (Cth) - Parenting provisions',
                    'Evidence Act 1995 (NSW)',
                    'Federal Circuit and Family Court Rules 2021',
                    'NSW Local Court Practice Notes'
                  ].map((doc, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-4" disabled>
                  <Download className="h-4 w-4 mr-2" />
                  Process Core Documents (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Ingestion Jobs</span>
              </CardTitle>
              <CardDescription>
                Monitor document processing status and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No ingestion jobs yet. Start by processing a document from the URL or Manual tabs.
                  </div>
                ) : (
                  jobs.map((job) => (
                    <Card key={job.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(job.status)}
                            <div>
                              <h4 className="font-medium">{job.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {job.source_type.replace('_', ' ')} • {new Date(job.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="text-lg font-medium">{job.chunks_created}</div>
                            <div className="text-xs text-muted-foreground">Chunks</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="text-lg font-medium">{job.citations_extracted}</div>
                            <div className="text-xs text-muted-foreground">Citations</div>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <div className="text-lg font-medium">{job.legal_concepts.length}</div>
                            <div className="text-xs text-muted-foreground">Concepts</div>
                          </div>
                        </div>

                        {job.legal_concepts.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground mb-1 block">
                              Legal Concepts:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {job.legal_concepts.slice(0, 5).map((concept, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {concept}
                                </Badge>
                              ))}
                              {job.legal_concepts.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{job.legal_concepts.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {job.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {job.error_message}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Processing Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Processing Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Chunk Size</Label>
              <Input
                type="number"
                value={config.chunk_size}
                onChange={(e) => setConfig({ ...config, chunk_size: parseInt(e.target.value) })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Overlap</Label>
              <Input
                type="number"
                value={config.overlap}
                onChange={(e) => setConfig({ ...config, overlap: parseInt(e.target.value) })}
                className="text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="boundaries"
                checked={config.respect_boundaries}
                onCheckedChange={(checked) => setConfig({ ...config, respect_boundaries: checked })}
              />
              <Label htmlFor="boundaries" className="text-xs">Respect Legal Boundaries</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="citations"
                checked={config.auto_citations}
                onCheckedChange={(checked) => setConfig({ ...config, auto_citations: checked })}
              />
              <Label htmlFor="citations" className="text-xs">Auto Extract Citations</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}