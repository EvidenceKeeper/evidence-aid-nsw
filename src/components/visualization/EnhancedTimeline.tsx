import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  Filter,
  TrendingUp,
  Clock,
  MessageCircle,
  Camera,
  FileText,
  Heart,
  DollarSign,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  file_name?: string;
}

interface EnhancedTimelineProps {
  filterCategory: string;
  searchTerm: string;
}

export function EnhancedTimeline({ filterCategory, searchTerm }: EnhancedTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [escalationPattern, setEscalationPattern] = useState<number[]>([]);

  useEffect(() => {
    loadTimelineEvents();
  }, []);

  const loadTimelineEvents = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase
        .from("timeline_events")
        .select(`
          *,
          files(name)
        `)
        .eq("user_id", sessionData.session.user.id)
        .order("event_date", { ascending: true });

      if (error) throw error;

      const formattedEvents = data.map(event => ({
        ...event,
        file_name: event.files?.name
      }));

      setEvents(formattedEvents);
      
      // Calculate escalation pattern
      const pattern = calculateEscalationPattern(formattedEvents);
      setEscalationPattern(pattern);
    } catch (error) {
      console.error("Failed to load timeline events:", error);
      toast.error("Failed to load timeline events");
    } finally {
      setLoading(false);
    }
  };

  const calculateEscalationPattern = (events: TimelineEvent[]) => {
    // Group events by month and calculate intensity
    const monthlyIntensity: { [key: string]: number } = {};
    
    events.forEach(event => {
      const monthKey = event.event_date.substring(0, 7); // YYYY-MM
      if (!monthlyIntensity[monthKey]) monthlyIntensity[monthKey] = 0;
      
      // Weight by category severity
      let weight = 1;
      if (event.category === "incident") weight = 3;
      else if (event.category === "threat") weight = 2.5;
      else if (event.category === "isolation") weight = 2;
      
      monthlyIntensity[monthKey] += weight;
    });
    
    return Object.values(monthlyIntensity);
  };

  const handleVerifyEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("timeline_events")
        .update({ verified: true })
        .eq("id", eventId);

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, verified: true } : event
      ));

      toast.success("Event verified");
    } catch (error) {
      console.error("Failed to verify event:", error);
      toast.error("Failed to verify event");
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "communication": return MessageCircle;
      case "incident": return AlertTriangle;
      case "photo": return Camera;
      case "medical": return Heart;
      case "financial": return DollarSign;
      case "witness": return Users;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "communication": return "bg-blue-100 text-blue-700 border-blue-200";
      case "incident": return "bg-red-100 text-red-700 border-red-200";
      case "photo": return "bg-orange-100 text-orange-700 border-orange-200";
      case "medical": return "bg-pink-100 text-pink-700 border-pink-200";
      case "financial": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "witness": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-emerald-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredEvents = events.filter(event => {
    if (filterCategory !== "all" && event.category !== filterCategory) return false;
    if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !event.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4">
      {/* Escalation Pattern */}
      {escalationPattern.length > 0 && (
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Escalation Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-1">
              {escalationPattern.map((intensity, index) => (
                <div
                  key={index}
                  className="flex-1 bg-muted rounded-sm overflow-hidden"
                  style={{ height: '40px' }}
                >
                  <div
                    className="bg-gradient-to-t from-red-400 to-orange-400 w-full"
                    style={{ 
                      height: `${Math.min(100, (intensity / Math.max(...escalationPattern)) * 100)}%`,
                      marginTop: 'auto'
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Intensity over time (higher bars indicate periods of increased activity)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timeline Events */}
      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <Card className="card-premium text-center py-8">
            <CardContent>
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                {filterCategory !== "all" 
                  ? "No events match the selected filter" 
                  : "Upload evidence files to build your timeline"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
            
            {filteredEvents.map((event, index) => {
              const Icon = getCategoryIcon(event.category);
              return (
                <div key={event.id} className="relative flex items-start space-x-4 pb-6">
                  {/* Timeline dot */}
                  <div className={`
                    relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2
                    ${event.verified ? 'bg-emerald-50 border-emerald-200' : 'bg-background border-border'}
                  `}>
                    <Icon className={`w-5 h-5 ${event.verified ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </div>

                  {/* Event card */}
                  <Card 
                    className={`flex-1 card-premium cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {new Date(event.event_date).toLocaleDateString()}
                              {event.event_time && ` at ${event.event_time}`}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(event.category)}`}
                            >
                              {event.category}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm">{event.title}</h3>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!event.verified && (
                            <span className={`text-xs ${getConfidenceColor(event.confidence)}`}>
                              {Math.round(event.confidence * 100)}% confidence
                            </span>
                          )}
                          {event.verified && (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {selectedEvent?.id === event.id && (
                      <CardContent className="border-t bg-muted/30">
                        <div className="space-y-3">
                          <p className="text-sm">{event.description}</p>
                          
                          {event.context && (
                            <div className="p-3 bg-background rounded border">
                              <p className="text-xs text-muted-foreground mb-1">Context:</p>
                              <p className="text-sm">{event.context}</p>
                            </div>
                          )}
                          
                          {event.file_name && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              Source: {event.file_name}
                            </div>
                          )}
                          
                          {!event.verified && (
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="text-xs text-muted-foreground">
                                AI-extracted • {Math.round(event.confidence * 100)}% confidence
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyEvent(event.id);
                                }}
                                className="text-xs"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verify
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}