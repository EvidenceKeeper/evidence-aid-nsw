import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCaseIntelligence } from "@/components/realtime/CaseIntelligenceProvider";
import { 
  Calendar,
  AlertCircle,
  MessageSquare,
  Camera,
  FileText,
  Heart,
  DollarSign,
  Users,
  Target,
  CheckCircle
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
          table: 'enhanced_timeline_events'
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
        .from("enhanced_timeline_events")
        .select('*')
        .eq('user_id', user.id)
        .order("event_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch file names separately
      const eventsWithFiles = await Promise.all((data || []).map(async (event) => {
        const { data: file } = await supabase
          .from('files')
          .select('name')
          .eq('id', event.file_id)
          .single();
        
        return {
          ...event,
          files: file || { name: 'Unknown' }
        };
      }));
      
      setEvents(eventsWithFiles);
    } catch (error) {
      console.error("Error loading timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPatternLabel = (category: string) => {
    const patterns: Record<string, string> = {
      'coercive_control': '🚨 Coercive Control',
      'threat': '⚠️ Threats',
      'monitoring': '👁️ Monitoring',
      'isolation': '🔒 Isolation',
      'financial_control': '💰 Financial Control',
      'emotional_abuse': '💔 Emotional Abuse',
      'physical_intimidation': '🤜 Physical Intimidation',
      'communication': '💬 Communication',
      'incident': '⚠️ Incident',
      'medical': '❤️ Medical',
      'financial': '💰 Financial',
      'witness': '👥 Witness',
      'photo': '📸 Photo',
      'document': '📄 Document',
    };
    return patterns[category] || category.replace('_', ' ');
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      communication: MessageSquare,
      incident: AlertCircle,
      medical: Heart,
      financial: DollarSign,
      witness: Users,
      photo: Camera,
      document: FileText,
    };
    return icons[category] || FileText;
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
      {/* Header with Case Strength */}
      <div className="p-4 border-b space-y-4">
        {/* Case Strength */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">📊 Case Strength</span>
            <span className={`text-sm font-bold ${getStrengthColor(intelligence.caseStrength)}`}>
              {Math.round(intelligence.caseStrength)}%
            </span>
          </div>
          <Progress 
            value={intelligence.caseStrength} 
            className="h-2" 
          />
        </div>

        {/* Priority Actions */}
        {intelligence.nextSteps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Priority Actions
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {intelligence.nextSteps.slice(0, 3).map((step, i) => (
                <li key={i}>• {step}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Timeline Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Timeline of Events
          </h3>
          
          {events.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h4 className="text-sm font-medium mb-1">No Events Yet</h4>
                <p className="text-xs text-muted-foreground">
                  Upload evidence to begin building your timeline.
                </p>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => {
              const CategoryIcon = getCategoryIcon(event.category);
              
              return (
                <Card 
                  key={event.id} 
                  className="p-4 hover:shadow-sm transition-all"
                >
                  {/* Date Header - Prominent */}
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-base">
                      {format(new Date(event.event_date), "dd MMM yyyy")}
                    </span>
                    {event.event_time && (
                      <span className="text-sm text-muted-foreground">
                        at {event.event_time}
                      </span>
                    )}
                    {event.verified && (
                      <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                    )}
                  </div>

                  {/* What Happened - Plain Language */}
                  <p className="text-sm mb-3 leading-relaxed">
                    {event.description}
                  </p>

                  {/* Pattern Tags + Evidence Source */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {getPatternLabel(event.category)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {event.files?.name || 'Evidence'}
                    </span>
                    {!event.verified && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        AI: {Math.round(event.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}