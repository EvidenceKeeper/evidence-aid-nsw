import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ProcessingJob {
  id: string;
  file_id: string;
  processing_type: string;
  status: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  files: {
    name: string;
  } | null;
}

export function ProcessingStatus() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcessingJobs();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('processing-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evidence_processing_queue'
        },
        () => loadProcessingJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProcessingJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('evidence_processing_queue')
        .select(`
          *,
          files(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs((data as any) || []);
    } catch (error) {
      console.error('Error loading processing jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getProgress = (job: ProcessingJob) => {
    switch (job.status) {
      case 'pending':
        return 0;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading processing status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  const activeJobs = jobs.filter(job => job.status === 'pending' || job.status === 'processing');
  const recentJobs = jobs.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Loader2 className="h-5 w-5" />
          Automatic Evidence Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Active Processing</h4>
            {activeJobs.map((job) => (
              <div key={job.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="font-medium">{job.files?.name || 'Unknown file'}</span>
                  </div>
                  <Badge variant={getStatusColor(job.status) as any}>
                    {job.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Progress value={getProgress(job)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {job.processing_type.replace('_', ' ')} • 
                    {job.status === 'processing' && ' Extracting timeline events and analyzing patterns...'}
                    {job.status === 'pending' && ' Queued for processing...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {recentJobs.some(job => job.status === 'completed' || job.status === 'failed') && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Results</h4>
            {recentJobs
              .filter(job => job.status === 'completed' || job.status === 'failed')
              .map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span>{job.files?.name || 'Unknown file'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(job.status) as any}>
                      {job.status}
                    </Badge>
                    {job.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(job.completed_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}