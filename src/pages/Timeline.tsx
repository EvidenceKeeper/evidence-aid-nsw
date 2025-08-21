import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleTimeline } from "@/components/timeline/SimpleTimeline";
import { Calendar, TrendingUp, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface TimelineEvent {
  id: string;
  event_date: string;
  event_time?: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  verified: boolean;
  context: string;
  files: { name: string };
}

export default function Timeline() {
  const [processing, setProcessing] = useState(false);
  const [hasEvents, setHasEvents] = useState(false);

  const checkForEvents = async () => {
    try {
      const { count, error } = await supabase
        .from("timeline_events")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setHasEvents((count || 0) > 0);
    } catch (error) {
      console.error("Error checking timeline events:", error);
    }
  };

  const extractTimelineFromFiles = async () => {
    setProcessing(true);
    try {
      // Get all processed files
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("id, name")
        .eq("status", "processed");

      if (filesError) throw filesError;

      if (!files?.length) {
        toast.error("No processed files found. Upload and process some evidence first.");
        return;
      }

      // Extract timeline from each file
      const extractions = files.map(async (file) => {
        try {
          const { data, error } = await supabase.functions.invoke("extract-timeline", {
            body: { file_id: file.id }
          });

          if (error) throw error;
          return { file: file.name, ...data };
        } catch (error) {
          console.error(`Error extracting from ${file.name}:`, error);
          return { file: file.name, error: error.message };
        }
      });

      const results = await Promise.all(extractions);
      const successful = results.filter(r => !r.error);
      const totalExtracted = successful.reduce((sum, r) => sum + (r.inserted || 0), 0);

      toast.success(`Found ${totalExtracted} events from ${successful.length} files! Building your timeline...`);

      // Check for events
      await checkForEvents();

    } catch (error) {
      console.error("Timeline extraction error:", error);
      toast.error("Failed to extract timeline events. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    checkForEvents();
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Your Timeline | NSW Legal Evidence Manager" description="Simple visual timeline of events built from your evidence files." />
      
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Your Case Timeline</h1>
          <p className="text-muted-foreground">
            {hasEvents 
              ? "Review and verify the events we found in your evidence" 
              : "We'll build a timeline from your evidence files automatically"}
          </p>
        </div>
        
        {!hasEvents && (
          <Button 
            onClick={extractTimelineFromFiles}
            disabled={processing}
            size="lg"
            className="flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Building timeline...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Build My Timeline
              </>
            )}
          </Button>
        )}
      </header>

      {!hasEvents ? (
        <Card className="text-center py-16">
          <CardContent>
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">Let's Build Your Timeline</CardTitle>
            <p className="text-muted-foreground mb-6">
              Upload evidence files first, then we'll automatically find important dates and events 
              to create a clear timeline for your case.
            </p>
            {processing ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Analyzing your evidence files...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  This helps organize your case chronologically for court or police
                </p>
                <Button 
                  onClick={extractTimelineFromFiles}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Build My Timeline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Click "Does this look right?" to verify events are accurate
            </div>
            <Button 
              onClick={extractTimelineFromFiles}
              disabled={processing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Update Timeline
                </>
              )}
            </Button>
          </div>
          
          <SimpleTimeline />
        </div>
      )}
    </div>
  );
}