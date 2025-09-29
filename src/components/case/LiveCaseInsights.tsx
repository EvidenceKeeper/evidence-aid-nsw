import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface CaseInsight {
  id: string;
  type: 'strength' | 'warning' | 'suggestion';
  message: string;
  timestamp: Date;
}

export function LiveCaseInsights() {
  const [caseStrength, setCaseStrength] = useState(0);
  const [insights, setInsights] = useState<CaseInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaseData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch case memory for strength score
      const { data: memory } = await supabase
        .from('case_memory')
        .select('case_strength_score, case_strength_reasons')
        .eq('user_id', user.id)
        .single();

      if (memory) {
        setCaseStrength(memory.case_strength_score || 0);
        
        // Convert reasons to insights
        const reasons = memory.case_strength_reasons as any[] || [];
        const insightData: CaseInsight[] = reasons.slice(0, 3).map((reason, idx) => ({
          id: `insight-${idx}`,
          type: reason.impact > 0 ? 'strength' : 'warning',
          message: reason.reason || reason.message || 'No details available',
          timestamp: new Date()
        }));
        
        setInsights(insightData);
      }

      setLoading(false);
    };

    fetchCaseData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('case-memory-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'case_memory'
        },
        (payload) => {
          const newData = payload.new as any;
          setCaseStrength(newData.case_strength_score || 0);
          
          const reasons = newData.case_strength_reasons as any[] || [];
          const insightData: CaseInsight[] = reasons.slice(0, 3).map((reason: any, idx: number) => ({
            id: `insight-${idx}`,
            type: reason.impact > 0 ? 'strength' : 'warning',
            message: reason.reason || reason.message || 'No details available',
            timestamp: new Date()
          }));
          
          setInsights(insightData);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return null;

  const getStrengthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStrengthLabel = (score: number) => {
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Moderate';
    return 'Building';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strength': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'suggestion': return <Sparkles className="h-4 w-4 text-blue-500" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Live Case Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Case Strength */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Case Strength</span>
            <span className={`font-bold ${getStrengthColor(caseStrength)}`}>
              {Math.round(caseStrength)}% {getStrengthLabel(caseStrength)}
            </span>
          </div>
          <Progress value={caseStrength} className="h-2" />
        </div>

        {/* Recent Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent Insights</p>
            <div className="space-y-2">
              {insights.map((insight) => (
                <div 
                  key={insight.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-border/50 text-xs"
                >
                  {getInsightIcon(insight.type)}
                  <p className="flex-1 leading-relaxed">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.length === 0 && (
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Add evidence to see AI-powered insights
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
