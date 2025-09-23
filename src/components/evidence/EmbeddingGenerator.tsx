import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Zap, FileText, CheckCircle } from "lucide-react";
import { processMultipleFiles, type FileProcessingResult } from "@/utils/embeddingProcessor";

interface FileToProcess {
  id: string;
  name: string;
  chunk_count: number;
  embedding_count: number;
}

export function EmbeddingGenerator() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [filesToProcess, setFilesToProcess] = useState<FileToProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeFilesData();
  }, []);

  const processAllFiles = async () => {
    if (filesToProcess.length === 0) {
      toast.info("No files need embedding generation");
      return;
    }

    setIsProcessing(true);
    
    try {
      toast.info(`Processing ${filesToProcess.length} files...`);
      
      const fileIds = filesToProcess.map(f => f.id);
      const results = await processMultipleFiles(fileIds);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      successful.forEach(result => {
        toast.success(`✅ ${result.fileName}: Generated ${result.embeddings_generated} embeddings (Exhibit ${result.exhibit_code})`);
      });
      
      failed.forEach(result => {
        toast.error(`❌ ${result.fileName}: ${result.error}`);
      });

      toast.success(`🎯 Processing complete! ${successful.length} files processed${failed.length > 0 ? `, ${failed.length} failed` : ''}`);
      
      // Reload files to show updated status
      await initializeFilesData();
    } catch (error: any) {
      toast.error(`Failed to process files: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const initializeFilesData = async () => {
    try {
      setIsLoading(true);
      
      // Get files with chunks but no embeddings
      const { data, error } = await supabase
        .from('files')
        .select(`
          id, 
          name,
          created_at
        `)
        .eq('status', 'processed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data?.length) {
        setFilesToProcess([]);
        return;
      }

      // Check which files have chunks without embeddings
      const filesNeedingEmbeddings: FileToProcess[] = [];
      
      for (const file of data) {
        const { data: chunkData, error: chunkError } = await supabase
          .from('chunks')
          .select('id, embedding')
          .eq('file_id', file.id)
          .limit(1);

        if (chunkError) continue;
        
        if (chunkData?.length > 0) {
          // Get total counts
          const { count: totalChunks } = await supabase
            .from('chunks')
            .select('id', { count: 'exact' })
            .eq('file_id', file.id);

          const { count: embeddedChunks } = await supabase
            .from('chunks')
            .select('id', { count: 'exact' })
            .eq('file_id', file.id)
            .not('embedding', 'is', null);

          if ((embeddedChunks || 0) === 0 && (totalChunks || 0) > 0) {
            filesNeedingEmbeddings.push({
              id: file.id,
              name: file.name,
              chunk_count: totalChunks || 0,
              embedding_count: embeddedChunks || 0
            });
          }
        }
      }

      setFilesToProcess(filesNeedingEmbeddings);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      toast.error(`Failed to load files: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Evidence Embedding Generator
        </CardTitle>
        <CardDescription>
          Generate embeddings for your uploaded evidence files to enable AI search and analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={initializeFilesData} 
            variant="outline" 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Check Files
          </Button>
          
          <Button 
            onClick={processAllFiles} 
            disabled={isProcessing || filesToProcess.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Process All Files ({filesToProcess.length})
          </Button>
        </div>

        {filesToProcess.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Files needing embeddings:</h4>
            <div className="space-y-1">
              {filesToProcess.map(file => (
                <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground">{file.chunk_count} chunks</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {filesToProcess.length === 0 && !isLoading && (
          <div className="text-center p-4 text-muted-foreground">
            No files need embedding generation. All your evidence is ready for AI analysis!
          </div>
        )}
      </CardContent>
    </Card>
  );
}