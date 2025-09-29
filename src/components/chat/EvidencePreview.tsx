import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, ExternalLink, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EvidenceFile {
  id: string;
  name: string;
  created_at: string;
  file_summary?: string;
  exhibit_code?: string;
  auto_category?: string;
}

interface EvidencePreviewProps {
  fileId: string;
  fileName: string;
  trigger?: React.ReactNode;
}

export function EvidencePreview({ fileId, fileName, trigger }: EvidencePreviewProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<EvidenceFile | null>(null);
  const [chunks, setChunks] = useState<Array<{ text: string; seq: number }>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadFileData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load file details
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('id, name, created_at, file_summary, exhibit_code, auto_category')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (fileError) throw fileError;
      setFile(fileData);

      // Load file chunks (preview text)
      const { data: chunkData, error: chunkError } = await supabase
        .from('chunks')
        .select('text, seq')
        .eq('file_id', fileId)
        .order('seq', { ascending: true })
        .limit(5);

      if (chunkError) throw chunkError;
      setChunks(chunkData || []);

    } catch (error) {
      console.error('Error loading file:', error);
      toast({
        title: "Error",
        description: "Failed to load evidence preview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadFileData();
  };

  const downloadFile = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Direct file download will be available soon"
    });
  };

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        {trigger || (
          <Badge variant="outline" className="hover:bg-accent transition-colors">
            <FileText className="h-3 w-3 mr-1" />
            {fileName}
          </Badge>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evidence Preview
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : file ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* File Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-lg">{file.name}</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {file.exhibit_code && (
                      <Badge variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {file.exhibit_code}
                      </Badge>
                    )}
                    {file.auto_category && (
                      <Badge variant="outline">{file.auto_category}</Badge>
                    )}
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(file.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>

                {/* Summary */}
                {file.file_summary && (
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{file.file_summary}</p>
                  </div>
                )}

                {/* Content Preview */}
                {chunks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Content Preview</h4>
                    <div className="space-y-3">
                      {chunks.map((chunk) => (
                        <div key={chunk.seq} className="text-sm text-muted-foreground bg-background border rounded p-3">
                          {chunk.text}
                        </div>
                      ))}
                    </div>
                    {chunks.length >= 5 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Showing first 5 sections...
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={downloadFile} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    onClick={() => window.open(`/evidence?file=${fileId}`, '_blank')}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
