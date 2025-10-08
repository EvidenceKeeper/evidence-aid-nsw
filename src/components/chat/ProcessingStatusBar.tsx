import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProcessingFile {
  id: string;
  name: string;
  status: string;
  chunk_count: number;
  embedding_count: number;
}

interface ProcessingStatusBarProps {
  fileId: string;
  fileName: string;
  onComplete?: () => void;
}

export function ProcessingStatusBar({ fileId, fileName, onComplete }: ProcessingStatusBarProps) {
  const [status, setStatus] = useState<'uploading' | 'ingesting' | 'embedding' | 'complete' | 'error'>('uploading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkStatus = async () => {
      try {
        // Check file status
        const { data: file, error: fileError } = await supabase
          .from('files')
          .select('status, name')
          .eq('id', fileId)
          .single();

        if (fileError) throw fileError;

        if (file.status === 'error') {
          setStatus('error');
          setError('File processing failed');
          clearInterval(interval);
          return;
        }

        if (file.status === 'uploaded') {
          setStatus('ingesting');
          setProgress(25);
        }

        if (file.status === 'processed') {
          setStatus('embedding');
          setProgress(50);

          // Check for embeddings
          const { data: chunks, error: chunksError } = await supabase
            .from('chunks')
            .select('id, embedding')
            .eq('file_id', fileId);

          if (!chunksError && chunks) {
            const totalChunks = chunks.length;
            const embeddedChunks = chunks.filter(c => c.embedding).length;
            
            if (totalChunks > 0) {
              const embeddingProgress = 50 + (embeddedChunks / totalChunks) * 50;
              setProgress(embeddingProgress);

              if (embeddedChunks === totalChunks) {
                setStatus('complete');
                setProgress(100);
                clearInterval(interval);
                
                toast({
                  title: "Evidence processed",
                  description: `${fileName} is now searchable and will be used in responses.`,
                });
                
                onComplete?.();
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Status check error:', err);
        setStatus('error');
        setError(err.message || 'Unknown error');
        clearInterval(interval);
      }
    };

    // Check immediately
    checkStatus();
    
    // Then poll every 2 seconds
    interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [fileId, fileName, onComplete, toast]);

  const retryProcessing = async () => {
    try {
      setStatus('embedding');
      setError(null);
      
      const { error } = await supabase.functions.invoke('enhanced-memory-processor', {
        body: { file_id: fileId }
      });

      if (error) throw error;

      toast({
        title: "Processing restarted",
        description: "Attempting to process evidence again...",
      });
    } catch (err: any) {
      toast({
        title: "Retry failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'ingesting':
        return 'Processing text...';
      case 'embedding':
        return 'Analyzing evidence...';
      case 'complete':
        return 'Ready to use';
      case 'error':
        return error || 'Processing failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'error' ? 'destructive' : status === 'complete' ? 'default' : 'secondary'}>
            {getStatusText()}
          </Badge>
          {status === 'error' && (
            <Button size="sm" variant="ghost" onClick={retryProcessing}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      {status !== 'complete' && status !== 'error' && (
        <Progress value={progress} className="h-1" />
      )}
    </div>
  );
}
