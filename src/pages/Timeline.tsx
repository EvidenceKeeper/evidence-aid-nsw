import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadTimelineEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("timeline_events")
        .select(`
          *,
          files(name)
        `)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading timeline:", error);
      toast({
        title: "Error",
        description: "Failed to load timeline events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
        toast({
          title: "No Files",
          description: "No processed files found. Upload and process some evidence first.",
          variant: "destructive"
        });
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

      toast({
        title: "Timeline Extraction Complete",
        description: `Extracted ${totalExtracted} events from ${successful.length} files`,
      });

      // Reload events
      await loadTimelineEvents();

    } catch (error) {
      console.error("Timeline extraction error:", error);
      toast({
        title: "Error",
        description: "Failed to extract timeline events",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const verifyEvent = async (eventId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from("timeline_events")
        .update({ verified })
        .eq("id", eventId);

      if (error) throw error;

      setEvents(events.map(e => 
        e.id === eventId ? { ...e, verified } : e
      ));

      toast({
        title: verified ? "Event Verified" : "Event Unverified",
        description: `Timeline event has been ${verified ? "verified" : "marked as unverified"}`,
      });
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event verification",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      incident: "bg-red-100 text-red-800",
      communication: "bg-blue-100 text-blue-800",
      legal_action: "bg-purple-100 text-purple-800",
      medical: "bg-green-100 text-green-800",
      financial: "bg-yellow-100 text-yellow-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  useEffect(() => {
    loadTimelineEvents();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <SEO title="Timeline | NSW Legal Evidence Manager" description="Extract and manage dated events, link evidence, and export a court-ready chronology." />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <SEO title="Timeline | NSW Legal Evidence Manager" description="Extract and manage dated events, link evidence, and export a court-ready chronology." />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Timeline</h1>
          <p className="text-muted-foreground">Auto-extracted events from your evidence files</p>
        </div>
        
        <Button 
          onClick={extractTimelineFromFiles}
          disabled={processing}
          className="flex items-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Extract Timeline
            </>
          )}
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Timeline Events</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload and process evidence files, then click "Extract Timeline" to automatically identify dated events.
            </p>
            <Button onClick={extractTimelineFromFiles} disabled={processing}>
              {processing ? "Processing..." : "Extract Timeline"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id} className={`transition-all hover:shadow-md ${
              event.verified ? "border-green-200 bg-green-50/50" : "border-border"
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground mb-1" />
                      <span className="font-medium">
                        {format(new Date(event.event_date), "MMM dd")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.event_date), "yyyy")}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        {event.event_time && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {event.event_time}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getCategoryColor(event.category)}>
                          {event.category.replace("_", " ")}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          {event.files?.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`text-xs px-2 py-1 rounded ${
                      event.confidence > 0.7 ? "bg-green-100 text-green-700" :
                      event.confidence > 0.4 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {Math.round(event.confidence * 100)}% confident
                    </div>
                    
                    <Button
                      size="sm"
                      variant={event.verified ? "default" : "outline"}
                      onClick={() => verifyEvent(event.id, !event.verified)}
                      className="flex items-center gap-1"
                    >
                      {event.verified ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                {event.context && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View context from document
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded text-muted-foreground">
                      "{event.context}..."
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}