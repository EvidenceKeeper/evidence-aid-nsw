import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Upload, FileText, Clock, CheckCircle, XCircle, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface QueueItem {
  id: string;
  file_name: string;
  status: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  processing_metadata: any;
}

export default function LegalTrainingDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: queueItems, isLoading } = useQuery({
    queryKey: ['legal-processing-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_document_processing_queue')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as QueueItem[];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('legal-document-processor');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Processing Started",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['legal-processing-queue'] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const filePath = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from('legal-training')
          .upload(filePath, file);
        
        if (error) throw error;
        return file.name;
      });

      await Promise.all(uploadPromises);
      
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded and queued for processing`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['legal-processing-queue'] });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const pendingCount = queueItems?.filter(item => item.status === 'pending').length || 0;
  const processingCount = queueItems?.filter(item => item.status === 'processing').length || 0;
  const completedCount = queueItems?.filter(item => item.status === 'completed').length || 0;
  const failedCount = queueItems?.filter(item => item.status === 'failed').length || 0;
  const totalCount = queueItems?.length || 0;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4">
      <SEO 
        title="Legal Training Dashboard | NSW Legal Evidence Manager" 
        description="Monitor and manage legal document training for AI assistant." 
      />
      
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Legal Training Dashboard</h1>
            <p className="text-muted-foreground">
              Upload and monitor legal document processing for Veronica's knowledge base
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => processQueueMutation.mutate()}
              disabled={processQueueMutation.isPending || pendingCount === 0}
              variant="outline"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Process Queue
            </Button>
            
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['legal-processing-queue'] })}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Legal Documents
            </CardTitle>
            <CardDescription>
              Upload PDF legal documents to train Veronica. Files are automatically queued for processing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <input
                type="file"
                multiple
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="w-full"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? "Uploading..." : "Click to select or drag and drop PDF files"}
                  </p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">{processingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{failedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        {totalCount > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Overall Progress</p>
                  <p className="text-sm text-muted-foreground">{completedCount}/{totalCount} documents</p>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Processing Queue</CardTitle>
            <CardDescription>
              Monitor the status of document processing jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading queue...</p>
              </div>
            ) : queueItems && queueItems.length > 0 ? (
              <div className="space-y-3">
                {queueItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <p className="font-medium">{item.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded: {new Date(item.created_at).toLocaleString()}
                        </p>
                        {item.error_message && (
                          <p className="text-sm text-red-500 mt-1">{item.error_message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      {item.processing_metadata?.ingestion_result && (
                        <Badge variant="outline">
                          {item.processing_metadata.ingestion_result.chunks_created} chunks
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No documents in queue</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload some legal documents to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}