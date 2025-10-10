import { useState, useEffect } from "react";
import { Activity, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EvidenceStats {
  processedFiles: number;
  totalChunks: number;
  embeddedChunks: number;
  lastProcessed: Date | null;
}

interface EvidenceDiagnosticsProps {
  onRefresh?: () => void;
}

export function EvidenceDiagnostics({ onRefresh }: EvidenceDiagnosticsProps) {
  const [stats, setStats] = useState<EvidenceStats>({
    processedFiles: 0,
    totalChunks: 0,
    embeddedChunks: 0,
    lastProcessed: null
  });
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get processed files
      const { data: files } = await supabase
        .from('files')
        .select('id, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'processed');

      if (!files || files.length === 0) {
        setStats({
          processedFiles: 0,
          totalChunks: 0,
          embeddedChunks: 0,
          lastProcessed: null
        });
        return;
      }

      // Get chunk counts
      const { data: chunks } = await supabase
        .from('chunks')
        .select('id, embedding, file_id')
        .in('file_id', files.map(f => f.id));

      const totalChunks = chunks?.length || 0;
      const embeddedChunks = chunks?.filter(c => c.embedding !== null).length || 0;

      // Find most recent update
      const lastProcessed = files.reduce((latest, file) => {
        const fileDate = new Date(file.updated_at);
        return !latest || fileDate > latest ? fileDate : latest;
      }, null as Date | null);

      setStats({
        processedFiles: files.length,
        totalChunks,
        embeddedChunks,
        lastProcessed
      });
    } catch (error) {
      console.error('Failed to load evidence stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const processAllMissing = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find files with missing embeddings
      const { data: files } = await supabase
        .from('files')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('status', 'processed');

      if (!files || files.length === 0) {
        toast({
          title: "No files to process",
          description: "All evidence is already processed"
        });
        return;
      }

      const filesToProcess = [];
      for (const file of files) {
        const { data: chunks } = await supabase
          .from('chunks')
          .select('embedding')
          .eq('file_id', file.id)
          .limit(1);

        if (!chunks || chunks.length === 0 || !chunks[0].embedding) {
          filesToProcess.push(file);
        }
      }

      if (filesToProcess.length === 0) {
        toast({
          title: "All embeddings complete",
          description: "No files need processing"
        });
        return;
      }

      toast({
        title: "Processing evidence",
        description: `Starting embeddings for ${filesToProcess.length} file(s)...`
      });

      // Process in parallel (up to 3 at a time)
      const batchSize = 3;
      for (let i = 0; i < filesToProcess.length; i += batchSize) {
        const batch = filesToProcess.slice(i, i + batchSize);
        await Promise.all(
          batch.map(file =>
            supabase.functions.invoke('enhanced-memory-processor', {
              body: { file_id: file.id }
            })
          )
        );
      }

      toast({
        title: "Processing started",
        description: "Evidence embeddings are being generated"
      });

      // Refresh stats after a delay
      setTimeout(() => {
        loadStats();
        onRefresh?.();
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const percentage = stats.totalChunks > 0 
    ? Math.round((stats.embeddedChunks / stats.totalChunks) * 100)
    : 0;

  const needsProcessing = stats.totalChunks > 0 && stats.embeddedChunks < stats.totalChunks;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div className="text-sm">
              <div className="font-medium">Evidence Status</div>
              <div className="text-xs text-muted-foreground">
                {stats.processedFiles} files · {stats.embeddedChunks}/{stats.totalChunks} chunks embedded ({percentage}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {needsProcessing && (
              <Badge variant="secondary" className="text-xs">
                {stats.totalChunks - stats.embeddedChunks} pending
              </Badge>
            )}
            {!needsProcessing && stats.totalChunks > 0 && (
              <Badge variant="default" className="text-xs">
                ✓ Ready
              </Badge>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={loadStats}
              disabled={loading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {needsProcessing && (
              <Button
                size="sm"
                variant="default"
                onClick={processAllMissing}
                disabled={processing}
                className="h-7 text-xs"
              >
                {processing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 mr-1" />
                    Process All
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
