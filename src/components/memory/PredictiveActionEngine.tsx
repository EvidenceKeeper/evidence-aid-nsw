import React from 'react';
import { Lightbulb, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTelepathicContext } from './TelepathicContextProvider';
import { useEnhancedMemory } from '@/hooks/useEnhancedMemory';

interface PredictiveAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'evidence' | 'legal' | 'timeline' | 'strategy';
  estimatedImpact: number; // 1-10 scale
  confidence: number; // 0-1 scale
}

export function PredictiveActionEngine() {
  const { currentGoal, telepathicMode } = useTelepathicContext();
  const { caseMemory } = useEnhancedMemory();

  if (!telepathicMode || !currentGoal) return null;

  // Generate predictive actions based on goal and case state
  const generatePredictiveActions = (): PredictiveAction[] => {
    const actions: PredictiveAction[] = [];
    
    // Evidence gap analysis
    if (caseMemory?.case_strength_score && caseMemory.case_strength_score < 0.7) {
      actions.push({
        id: 'evidence-strengthen',
        title: 'Upload Supporting Documentation',
        description: 'Your case strength could improve with additional evidence documents',
        priority: 'high',
        category: 'evidence',
        estimatedImpact: 8,
        confidence: 0.85
      });
    }

    // Timeline completeness
    if (!caseMemory?.timeline_summary || caseMemory.timeline_summary.length < 100) {
      actions.push({
        id: 'timeline-expand',
        title: 'Add Timeline Details',
        description: 'A more detailed timeline could strengthen your case narrative',
        priority: 'medium',
        category: 'timeline',
        estimatedImpact: 6,
        confidence: 0.7
      });
    }

    // Goal-specific suggestions
    if (currentGoal.toLowerCase().includes('custody')) {
      actions.push({
        id: 'custody-evidence',
        title: 'Gather Custody-Specific Evidence',
        description: 'Consider uploading school records, medical records, or communication logs',
        priority: 'high',
        category: 'evidence',
        estimatedImpact: 9,
        confidence: 0.9
      });
    }

    return actions.slice(0, 3); // Show top 3 predictions
  };

  const predictiveActions = generatePredictiveActions();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-muted/10 text-muted-foreground border-muted/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (predictiveActions.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Next Steps Predicted
          <Badge variant="secondary" className="text-xs">
            Telepathic
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictiveActions.map((action) => (
          <div
            key={action.id}
            className="flex items-start justify-between p-3 rounded-lg bg-card/50 border border-border/50"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">{action.title}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getPriorityColor(action.priority)}`}
                >
                  {action.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{action.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Impact: {action.estimatedImpact}/10
                </span>
                <span>Confidence: {Math.round(action.confidence * 100)}%</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}