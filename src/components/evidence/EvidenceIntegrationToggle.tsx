import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Brain, Zap, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface EvidenceFile {
  id: string;
  name: string;
  status: string;
  created_at: string;
  analysis_count: number;
  connections_count: number;
}

interface EvidenceIntegrationToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onAnalysisComplete?: () => void;
}

export default function EvidenceIntegrationToggle({ 
  enabled, 
  onEnabledChange, 
  onAnalysisComplete 
}: EvidenceIntegrationToggleProps) {
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvidenceFiles();
  }, []);

  const fetchEvidenceFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get files with analysis and connection counts
      const { data: files, error } = await supabase
        .from('files')
        .select(`
          id,
          name,
          status,
          created_at,
          evidence_analysis!inner(count),
          evidence_legal_connections!inner(count)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const processedFiles = files?.map(file => ({
        id: file.id,
        name: file.name,
        status: file.status,
        created_at: file.created_at,
        analysis_count: file.evidence_analysis?.length || 0,
        connections_count: file.evidence_legal_connections?.length || 0,
      })) || [];

      setEvidenceFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching evidence files:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEvidence = async () => {
    if (evidenceFiles.length === 0) {
      toast({
        title: "No Evidence Found",
        description: "Upload some evidence files first to enable this feature.",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const totalFiles = evidenceFiles.length;
      let completed = 0;

      for (const file of evidenceFiles) {
        try {
          const { error } = await supabase.functions.invoke('evidence-legal-analyzer', {
            body: {
              file_id: file.id,
              analysis_types: ['legal_relevance', 'case_strength'],
              generate_connections: true
            }
          });

          if (error) {
            console.error(`Analysis failed for file ${file.name}:`, error);
          }
        } catch (error) {
          console.error(`Error analyzing ${file.name}:`, error);
        }

        completed++;
        setAnalysisProgress((completed / totalFiles) * 100);
      }

      await fetchEvidenceFiles(); // Refresh file data
      onAnalysisComplete?.();
      
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${totalFiles} evidence files and connected them to legal knowledge.`,
      });
    } catch (error) {
      console.error('Evidence analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze evidence files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const getFileStatusIcon = (file: EvidenceFile) => {
    if (file.analysis_count > 0 && file.connections_count > 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (file.analysis_count > 0) {
      return <Brain className="h-4 w-4 text-blue-600" />;
    } else if (file.status === 'processed') {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
    return <FileText className="h-4 w-4 text-gray-600" />;
  };

  const getFileStatusText = (file: EvidenceFile): string => {
    if (file.analysis_count > 0 && file.connections_count > 0) {
      return `Ready (${file.connections_count} legal connections)`;
    } else if (file.analysis_count > 0) {
      return 'Analyzed';
    } else if (file.status === 'processed') {
      return 'Needs Analysis';
    }
    return 'Processing';
  };

  const canEnable = evidenceFiles.some(f => f.analysis_count > 0 && f.connections_count > 0);
  const totalConnections = evidenceFiles.reduce((sum, f) => sum + f.connections_count, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-48"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Evidence Integration</span>
        </CardTitle>
        <CardDescription>
          Connect your evidence files with legal knowledge for personalized advice
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Use My Evidence</Label>
            <p className="text-sm text-muted-foreground">
              Include your case files when searching legal knowledge
            </p>
          </div>
          <Switch
            checked={enabled && canEnable}
            onCheckedChange={onEnabledChange}
            disabled={!canEnable}
          />
        </div>

        {!canEnable && evidenceFiles.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Analysis Required</span>
            </div>
            <p className="text-xs text-yellow-700 mb-3">
              Your evidence files need to be analyzed and connected to legal knowledge before enabling this feature.
            </p>
            <Button
              size="sm"
              onClick={analyzeEvidence}
              disabled={analyzing}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Analyzing Evidence...
                </>
              ) : (
                <>
                  <Brain className="h-3 w-3 mr-2" />
                  Analyze Evidence Files
                </>
              )}
            </Button>
          </div>
        )}

        {analyzing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Analyzing evidence files...</span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
          </div>
        )}

        {/* Evidence Files Status */}
        {evidenceFiles.length > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Evidence Files</h4>
                {totalConnections > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {totalConnections} legal connections
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {evidenceFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {getFileStatusIcon(file)}
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getFileStatusText(file)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {evidenceFiles.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No evidence files found. Upload files in the Evidence section first.
            </p>
          </div>
        )}

        {/* Information Panel */}
        {enabled && canEnable && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Evidence Integration Active</span>
            </div>
            <p className="text-xs text-blue-700">
              Legal searches and AI responses will now include insights from your evidence files, 
              showing how laws apply to your specific situation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}