import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Brain, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalysisFeedbackProps {
  analysis: {
    success: boolean;
    summary: string;
    insights?: string[];
    case_impact?: string;
    strength_change?: number;
    new_strength?: number;
    patterns_found?: number;
    relationships_found?: number;
    next_steps?: string[];
  };
  fileName: string;
  onClose?: () => void;
}

export function EvidenceAnalysisFeedback({ analysis, fileName, onClose }: AnalysisFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (analysis.success) {
      // Auto-hide after 10 seconds unless user is interacting
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [analysis.success, onClose]);

  if (!isVisible || !analysis.success) return null;

  const strengthChange = analysis.strength_change || 0;
  const strengthPercentage = Math.round((analysis.new_strength || 0) * 100);

  return (
    <Card className="mb-6 border-success bg-success/5 shadow-lg animate-in slide-in-from-bottom duration-500">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-success/10 rounded-full">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              Evidence Analysis Complete
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {fileName} has been processed and analyzed
            </p>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onClose();
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main feedback message */}
        <div className="bg-card/50 rounded-lg p-4 border">
          <p className="text-sm leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Case impact and strength change */}
        {analysis.case_impact && (
          <div className="flex items-start gap-3">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">Case Impact</h4>
              <p className="text-sm text-muted-foreground">{analysis.case_impact}</p>
              
              {strengthChange > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    Case Strength: {strengthPercentage}% (+{Math.round(strengthChange * 100)}%)
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key insights */}
        {analysis.insights && analysis.insights.length > 0 && (
          <div className="flex items-start gap-3">
            <Brain className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">Key Insights</h4>
              <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                {analysis.insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Analysis statistics */}
        {(analysis.patterns_found || analysis.relationships_found) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            {analysis.patterns_found > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">{analysis.patterns_found}</div>
                <div className="text-xs text-muted-foreground">New Pattern{analysis.patterns_found !== 1 ? 's' : ''}</div>
              </div>
            )}
            {analysis.relationships_found > 0 && (
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">{analysis.relationships_found}</div>
                <div className="text-xs text-muted-foreground">Connection{analysis.relationships_found !== 1 ? 's' : ''}</div>
              </div>
            )}
          </div>
        )}

        {/* Next steps */}
        {analysis.next_steps && analysis.next_steps.length > 0 && (
          <div className="flex items-start gap-3 pt-2 border-t">
            <ArrowRight className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">Suggested Next Steps</h4>
              <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                {analysis.next_steps.slice(0, 2).map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}