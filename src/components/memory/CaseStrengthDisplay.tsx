import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { useEnhancedMemory } from "@/hooks/useEnhancedMemory";
import { supabase } from "@/integrations/supabase/client";

interface CaseStrengthChange {
  old_score: number;
  new_score: number;
  change: number;
  boosters: string[];
  timestamp: string;
}

export function CaseStrengthDisplay() {
  const { caseMemory } = useEnhancedMemory();
  const [recentChanges, setRecentChanges] = useState<CaseStrengthChange[]>([]);
  const [showBoosters, setShowBoosters] = useState(false);

  useEffect(() => {
    loadRecentChanges();
  }, [caseMemory]);

  const loadRecentChanges = async () => {
    // In a real implementation, you'd have a case_strength_history table
    // For now, we'll simulate recent changes
    if (caseMemory?.case_strength_score) {
      const mockChanges: CaseStrengthChange[] = [
        {
          old_score: Math.max(0, (caseMemory.case_strength_score || 0) - 8),
          new_score: caseMemory.case_strength_score,
          change: 8,
          boosters: ["Upload original police statement", "Add child's school attendance logs", "Cross-check visitation breaches"],
          timestamp: new Date().toISOString(),
        }
      ];
      setRecentChanges(mockChanges);
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 70) return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" };
    if (strength >= 40) return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" };
    return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 70) return "Strong";
    if (strength >= 40) return "Moderate"; 
    return "Developing";
  };

  if (!caseMemory) return null;

  const currentScore = Math.round(caseMemory.case_strength_score || 0);
  const colors = getStrengthColor(currentScore);
  const hasRecentChange = recentChanges.length > 0 && recentChanges[0].change >= 3;

  return (
    <Card className={`${colors.border} ${colors.bg} transition-all duration-500`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" />
          Case Strength Assessment
          {hasRecentChange && (
            <Badge variant="secondary" className="ml-auto">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{recentChanges[0].change}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${colors.text} mb-1`}>
            {currentScore}%
          </div>
          <div className="text-sm text-muted-foreground mb-3">
            {getStrengthLabel(currentScore)} Case
          </div>
          <Progress 
            value={currentScore} 
            className="h-3" 
          />
        </div>

        {/* Recent Change */}
        {hasRecentChange && (
          <div className="bg-white/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-medium">Recent Improvement</span>
              <span className="text-green-600 font-bold">+{recentChanges[0].change} points</span>
            </div>
            
            {!showBoosters ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowBoosters(true)}
                className="text-xs"
              >
                View strength boosters →
              </Button>
            ) : (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Recommended actions to strengthen your case:
                </div>
                {recentChanges[0].boosters.map((booster, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-primary font-medium">({i + 1})</span>
                    <span className="text-muted-foreground">{booster}</span>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowBoosters(false)}
                  className="text-xs mt-2"
                >
                  Hide boosters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Key Reasons */}
        {caseMemory.case_strength_reasons && Array.isArray(caseMemory.case_strength_reasons) && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Key Strengths:
            </div>
            {caseMemory.case_strength_reasons.slice(0, 2).map((reason: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  {typeof reason === 'string' ? reason : reason.description || 'Case strength factor'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Goal Context */}
        {caseMemory.primary_goal && (
          <div className="bg-white/50 rounded-lg p-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Working toward:
            </div>
            <div className="text-xs text-primary font-medium">
              {caseMemory.primary_goal}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}