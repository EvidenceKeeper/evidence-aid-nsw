import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Link2, 
  FileText, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Target
} from 'lucide-react';

interface EvidenceFile {
  id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
}

interface LegalConnection {
  id: string;
  legal_section_id: string;
  connection_type: string;
  relevance_score: number;
  explanation: string;
  legal_sections: {
    title: string;
    content: string;
    legal_documents: {
      title: string;
      document_type: string;
    };
  };
}

export default function EvidenceLegalConnector() {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [connections, setConnections] = useState<LegalConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEvidenceFiles();
    loadConnections();
  }, []);

  const loadEvidenceFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('id, name, category, status, created_at')
        .eq('status', 'processed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: "Failed to load evidence files",
        variant: "destructive",
      });
    }
  };

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('evidence_legal_connections')
        .select(`
          id,
          legal_section_id,
          connection_type,
          relevance_score,
          explanation,
          legal_sections!inner(
            title,
            content,
            legal_documents!inner(
              title,
              document_type
            )
          )
        `)
        .order('relevance_score', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeConnections = async (fileId?: string) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('evidence-legal-analyzer', {
        body: { 
          file_id: fileId,
          mode: 'enhanced_analysis'
        }
      });

      if (error) throw error;

      toast({
        title: "Analysis Complete",
        description: `Found ${data.connections_created || 0} new legal connections`,
      });

      await loadConnections();
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze legal connections",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getConnectionTypeColor = (type: string, relevance: number) => {
    const intensity = relevance > 0.7 ? 'strong' : relevance > 0.4 ? 'medium' : 'weak';
    
    switch (type.toLowerCase()) {
      case 'direct_evidence':
        return intensity === 'strong' 
          ? 'bg-green-100 text-green-800 border-green-300' 
          : 'bg-green-50 text-green-700 border-green-200';
      case 'supporting_evidence':
        return intensity === 'strong' 
          ? 'bg-blue-100 text-blue-800 border-blue-300' 
          : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'circumstantial_evidence':
        return intensity === 'strong' 
          ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
          : 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const formatConnectionType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading evidence connections...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Evidence-Legal Connection Analysis
          </CardTitle>
          <CardDescription>
            Analyze your evidence files to find connections with legal authorities and build stronger cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.length} evidence files • {connections.length} legal connections found
            </div>
            <Button 
              onClick={() => analyzeConnections()}
              disabled={analyzing || files.length === 0}
              size="sm"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Analyze All Files
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Evidence Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No evidence files found.</p>
              <p className="text-sm">Upload files in the Evidence section to get started.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {files.map((file) => {
                const fileConnections = connections.filter(c => 
                  // This would need to be properly linked via evidence_file_id
                  c.legal_section_id // placeholder for now
                );
                
                return (
                  <div 
                    key={file.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedFile === file.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {file.category} • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {fileConnections.length} connections
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => analyzeConnections(file.id)}
                        disabled={analyzing}
                      >
                        <Zap className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Legal Connections Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No legal connections found yet.</p>
              <p className="text-sm">Run analysis on your evidence files to discover connections.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {connection.legal_sections.legal_documents.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {connection.legal_sections.title}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        variant="outline"
                        className={getConnectionTypeColor(connection.connection_type, connection.relevance_score)}
                      >
                        {formatConnectionType(connection.connection_type)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Progress 
                          value={connection.relevance_score * 100} 
                          className="w-16 h-2"
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(connection.relevance_score * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {connection.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}