import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ProcessingStatus {
  total_files: number;
  processed_files: number;
  analyzing_files: number;
  pending_files: number;
  last_trigger: string | null;
}

export default function AutoProcessingTrigger() {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkProcessingStatus();
    
    // Set up real-time subscription for file uploads
    const subscription = supabase
      .channel('file-uploads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'files',
          filter: 'status=eq.processed'
        },
        handleNewFile
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkProcessingStatus = async () => {
    try {
      // Get total files by user
      const { data: allFiles } = await supabase
        .from('files')
        .select('id, status')
        .eq('status', 'processed');

      // Get files with comprehensive analysis
      const { data: analyzedFiles } = await supabase
        .from('evidence_comprehensive_analysis')
        .select('file_id');

      // Get files currently in processing queue
      const { data: queuedFiles } = await supabase
        .from('evidence_processing_queue')
        .select('file_id, status');

      const totalFiles = allFiles?.length || 0;
      const analyzedIds = new Set(analyzedFiles?.map(a => a.file_id) || []);
      const processedFiles = allFiles?.filter(f => analyzedIds.has(f.id)).length || 0;
      const analyzingFiles = queuedFiles?.filter(q => q.status === 'processing').length || 0;
      const pendingFiles = totalFiles - processedFiles - analyzingFiles;

      setProcessingStatus({
        total_files: totalFiles,
        processed_files: processedFiles,
        analyzing_files: analyzingFiles,
        pending_files: pendingFiles,
        last_trigger: null
      });

      // Auto-trigger analysis if there are unprocessed files
      if (pendingFiles > 0 && !isTriggering) {
        triggerIntelligenceProcessing();
      }

    } catch (error) {
      console.error('Error checking processing status:', error);
    }
  };

  const handleNewFile = async (payload: any) => {
    console.log('New file detected:', payload.new);
    
    // Small delay to ensure file is fully processed
    setTimeout(() => {
      triggerIntelligenceProcessing();
      checkProcessingStatus();
    }, 2000);
  };

  const triggerIntelligenceProcessing = async () => {
    if (isTriggering) return;
    
    setIsTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('evidence-intelligence-orchestrator', {
        body: { trigger_type: 'auto_new_file' }
      });

      if (error) throw error;

      if (data.files_to_process > 0) {
        toast({
          title: "Evidence Analysis Started",
          description: `Processing ${data.files_to_process} files with comprehensive intelligence analysis`,
        });
      }

    } catch (error) {
      console.error('Auto-trigger failed:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  if (!processingStatus) return null;

  const completionPercentage = processingStatus.total_files > 0 
    ? Math.round((processingStatus.processed_files / processingStatus.total_files) * 100)
    : 0;

  const hasUnprocessedFiles = processingStatus.pending_files > 0 || processingStatus.analyzing_files > 0;

  if (!hasUnprocessedFiles && processingStatus.processed_files === 0) {
    return null; // No files to show status for
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4" />
          Evidence Intelligence Status
        </CardTitle>
        <CardDescription className="text-xs">
          Automatic analysis of uploaded evidence files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress Overview */}
          <div className="flex items-center justify-between text-sm">
            <span>Analysis Progress</span>
            <span className="font-medium">{completionPercentage}% Complete</span>
          </div>
          
          <Progress value={completionPercentage} className="h-2" />

          {/* Status Breakdown */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-lg font-semibold">{processingStatus.processed_files}</span>
              </div>
              <div className="text-xs text-muted-foreground">Analyzed</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-lg font-semibold">{processingStatus.analyzing_files}</span>
              </div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-lg font-semibold">{processingStatus.pending_files}</span>
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>

          {/* Processing Status Message */}
          {isTriggering && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Brain className="h-4 w-4 animate-pulse" />
                <span>Starting comprehensive evidence analysis...</span>
              </div>
            </div>
          )}

          {processingStatus.analyzing_files > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Clock className="h-4 w-4 animate-spin" />
                <span>
                  Analyzing {processingStatus.analyzing_files} file{processingStatus.analyzing_files !== 1 ? 's' : ''}...
                  This includes multi-lens analysis, pattern detection, and timeline extraction.
                </span>
              </div>
            </div>
          )}

          {processingStatus.pending_files > 0 && !isTriggering && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {processingStatus.pending_files} file{processingStatus.pending_files !== 1 ? 's' : ''} waiting for analysis.
                  Intelligence processing will start automatically.
                </span>
              </div>
            </div>
          )}

          {hasUnprocessedFiles === false && processingStatus.processed_files > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>
                  All evidence files have been analyzed with comprehensive intelligence.
                  Your AI assistant has deep understanding of your case.
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}