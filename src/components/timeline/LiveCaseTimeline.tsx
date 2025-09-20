import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCaseIntelligence } from "@/components/realtime/CaseIntelligenceProvider";
import { 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Brain,
  Activity,
  Eye,
  Users,
  MessageSquare,
  Camera,
  FileText,
  Heart,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export function LiveCaseTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { intelligence } = useCaseIntelligence();

  useEffect(() => {
    loadEvents();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('timeline-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events'
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("timeline_events")
        .select(`
          *,
          files(name)
        `)
        .eq('user_id', user.id)
        .order("event_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
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
      communication: "bg-blue-100 text-blue-700",
      incident: "bg-red-100 text-red-700",
      medical: "bg-green-100 text-green-700",
      financial: "bg-yellow-100 text-yellow-700",
      witness: "bg-purple-100 text-purple-700",
      photo: "bg-indigo-100 text-indigo-700",
      document: "bg-gray-100 text-gray-700",
    };
    return colors[category as keyof typeof colors] || colors.document;
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 70) return "text-green-600";
    if (strength >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="h-full p-4">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                    <div className="h-2 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Live Case Analysis</h2>
        </div>
        
        {/* Case Strength */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Case Strength</span>
            <span className={`text-sm font-bold ${getStrengthColor(intelligence.caseStrength)}`}>
              {Math.round(intelligence.caseStrength)}%
            </span>
          </div>
          <Progress 
            value={intelligence.caseStrength} 
            className="h-2" 
          />
        </div>

        {/* Analysis Status */}
        {intelligence.isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4 animate-pulse" />
            <span>AI analyzing new evidence...</span>
          </div>
        )}
      </div>

      {/* Timeline Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Recent Insights */}
          {intelligence.insights.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">Latest Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {intelligence.insights.slice(0, 2).map((insight, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      • {insight}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patterns */}
          {intelligence.patterns.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-sm">Key Patterns</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {intelligence.patterns.slice(0, 2).map((pattern, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {pattern.type}
                        </Badge>
                        <span className={`text-xs font-medium ${getStrengthColor(pattern.strength * 100)}`}>
                          {Math.round(pattern.strength * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pattern.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Timeline Events */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Recent Events</h3>
            </div>
            
            {events.length === 0 ? (
              <Card className="text-center py-6">
                <CardContent>
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No timeline events yet. Upload evidence to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              events.map((event, index) => {
                const CategoryIcon = getCategoryIcon(event.category);
                
                return (
                  <Card 
                    key={event.id} 
                    className={`transition-all hover:shadow-sm ${
                      event.verified ? 'bg-green-50/50 border-green-200' : 'bg-card'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex gap-2">
                        {/* Date */}
                        <div className={`w-8 h-8 rounded-full border flex flex-col items-center justify-center text-xs ${
                          event.verified 
                            ? 'bg-green-100 border-green-300 text-green-700' 
                            : 'bg-primary/10 border-primary/30 text-primary'
                        }`}>
                          <span className="text-xs font-medium">
                            {format(new Date(event.event_date), "dd")}
                          </span>
                        </div>

                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1 line-clamp-2">{event.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {event.description}
                          </p>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${getCategoryColor(event.category)}`}>
                              <CategoryIcon className="w-2 h-2 mr-1" />
                              {event.category}
                            </Badge>
                            
                            {event.verified ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {Math.round(event.confidence * 100)}% confident
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Next Steps */}
          {intelligence.nextSteps.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm">Recommended Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {intelligence.nextSteps.slice(0, 3).map((step, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      • {step}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}