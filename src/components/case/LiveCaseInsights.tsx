import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Eye, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveInsight {
  id: string;
  insight: string;
  type: 'strength' | 'pattern' | 'connection' | 'gap';
  confidence: number;
  timestamp: string;
}

export function LiveCaseInsights() {
  const [insights, setInsights] = useState<LiveInsight[]>([]);
  const [caseStrength, setCaseStrength] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get recent analysis insights
      const { data: analysisHistory } = await supabase
        .from('case_analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get current case strength
      const { data: strategy } = await supabase
        .from('legal_strategy')
        .select('case_strength_overall')
        .eq('user_id', user.id)
        .single();

      if (analysisHistory) {
        const formattedInsights = analysisHistory.flatMap((analysis) => 
          (analysis.key_insights || []).map((insight, index) => ({
            id: `${analysis.id}-${index}`,
            insight: insight as string,
            type: analysis.analysis_type === 'pattern_identified' ? 'pattern' as const :
                  analysis.case_strength_change > 0 ? 'strength' as const :
                  'connection' as const,
            confidence: Math.min(0.9, 0.6 + (analysis.case_strength_change || 0) * 2),
            timestamp: analysis.created_at
          }))
        );

        setInsights(formattedInsights.slice(0, 4));
      }

      setCaseStrength(strategy?.case_strength_overall || 0);
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading insights:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscribeToUpdates = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const channel = supabase
        .channel('live-insights')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'case_analysis_history',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadInsights();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    subscribeToUpdates();
  }, []);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">Case Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  const getInsightIcon = (type: LiveInsight['type']) => {
    switch (type) {
      case 'strength': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'pattern': return <Brain className="h-4 w-4 text-primary" />;
      case 'connection': return <Eye className="h-4 w-4 text-info" />;
      default: return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getInsightColor = (type: LiveInsight['type']) => {
    switch (type) {
      case 'strength': return 'bg-success/10 text-success border-success/20';
      case 'pattern': return 'bg-primary/10 text-primary border-primary/20';
      case 'connection': return 'bg-info/10 text-info border-info/20';
      default: return 'bg-warning/10 text-warning border-warning/20';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-lg">Live Case Intelligence</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Case Strength:</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {Math.round(caseStrength * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div 
            key={insight.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-card/80 border border-border/50"
          >
            <div className="mt-0.5">
              {getInsightIcon(insight.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed text-foreground/90">
                {insight.insight}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getInsightColor(insight.type)}`}
                >
                  {insight.type === 'strength' && 'Strengthens Case'}
                  {insight.type === 'pattern' && 'Pattern Identified'}
                  {insight.type === 'connection' && 'Evidence Connected'}
                  {insight.type === 'gap' && 'Evidence Gap'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(insight.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Your case is continuously analyzed as you add evidence. I remember every detail and build upon each new piece of information.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}