import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Camera,
  FileText,
  Heart,
  DollarSign,
  Users
} from "lucide-react";
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
  context?: string;
  files?: { name: string };
}

export function SimpleTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("timeline_events")
        .select(`
          *,
          files(name)
        `)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (eventId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from("timeline_events")
        .update({ verified })
        .eq("id", eventId);

      if (error) throw error;

      setEvents(events.map(e => 
        e.id === eventId ? { ...e, verified } : e
      ));
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      communication: MessageSquare,
      incident: AlertCircle,
      medical: Heart,
      financial: DollarSign,
      witness: Users,
      photo: Camera,
      document: FileText,
    };
    return icons[category as keyof typeof icons] || FileText;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      communication: "bg-blue-50 text-blue-700 border-blue-200",
      incident: "bg-red-50 text-red-700 border-red-200",
      medical: "bg-green-50 text-green-700 border-green-200",
      financial: "bg-yellow-50 text-yellow-700 border-yellow-200",
      witness: "bg-purple-50 text-purple-700 border-purple-200",
      photo: "bg-indigo-50 text-indigo-700 border-indigo-200",
      document: "bg-gray-50 text-gray-700 border-gray-200",
      coercive_control: "bg-orange-50 text-orange-700 border-orange-200",
      threat: "bg-red-50 text-red-700 border-red-200",
      monitoring: "bg-purple-50 text-purple-700 border-purple-200",
      isolation: "bg-gray-50 text-gray-700 border-gray-200",
      financial_control: "bg-yellow-50 text-yellow-700 border-yellow-200",
      emotional_abuse: "bg-pink-50 text-pink-700 border-pink-200",
      custody_related: "bg-blue-50 text-blue-700 border-blue-200",
      child_welfare: "bg-green-50 text-green-700 border-green-200",
    };
    return colors[category as keyof typeof colors] || colors.document;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Your Case Timeline</h3>
          <p className="text-muted-foreground mb-4">
            Upload evidence files and your timeline will automatically build itself, showing you exactly where you need more evidence to strengthen your case.
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Timeline events are extracted automatically from every upload</p>
            <p>• Events are filtered based on your legal goal</p>
            <p>• Visual gaps show where you need more evidence</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, index) => {
        const CategoryIcon = getCategoryIcon(event.category);
        const isLast = index === events.length - 1;
        
        return (
          <div key={event.id} className="relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-6 top-12 bottom-0 w-px bg-border"></div>
            )}
            
            <Card className={`ml-0 transition-all hover:shadow-sm ${
              event.verified ? 'bg-green-50/50 border-green-200' : 'bg-card'
            }`}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Date circle */}
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center text-xs font-medium ${
                      event.verified 
                        ? 'bg-green-100 border-green-300 text-green-700' 
                        : 'bg-primary/10 border-primary/30 text-primary'
                    }`}>
                      <span>{format(new Date(event.event_date), "MMM")}</span>
                      <span>{format(new Date(event.event_date), "dd")}</span>
                    </div>
                  </div>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-base mb-1">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                        
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`text-xs ${getCategoryColor(event.category)}`}>
                            <CategoryIcon className="w-3 h-3 mr-1" />
                            {event.category.replace('_', ' ')}
                          </Badge>
                          
                          {event.event_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {event.event_time}
                            </div>
                          )}
                          
                          {event.files?.name && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              {event.files.name}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Verification button */}
                      <Button
                        size="sm"
                        variant={event.verified ? "default" : "outline"}
                        onClick={() => handleVerify(event.id, !event.verified)}
                        className={`flex items-center gap-2 ${
                          event.verified 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {event.verified ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            Does this look right?
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Confidence indicator */}
                    {!event.verified && (
                      <div className={`inline-block text-xs px-2 py-1 rounded ${
                        event.confidence > 0.7 ? "bg-green-100 text-green-700" :
                        event.confidence > 0.4 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {Math.round(event.confidence * 100)}% confident this is accurate
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}