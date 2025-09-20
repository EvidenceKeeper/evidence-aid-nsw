import React from 'react';
import { Target, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTelepathicContext } from './TelepathicContextProvider';
import { useEnhancedMemory } from '@/hooks/useEnhancedMemory';

interface TelepathicResponseTemplatesProps {
  children: React.ReactNode;
  complexity?: 'simple' | 'moderate' | 'complex';
  className?: string;
}

export function TelepathicResponseTemplates({ 
  children, 
  complexity = 'moderate',
  className = "" 
}: TelepathicResponseTemplatesProps) {
  const { currentGoal, isGoalLocked } = useTelepathicContext();
  const { caseMemory } = useEnhancedMemory();

  const getGoalProgress = () => {
    if (!caseMemory?.case_strength_score) return 0;
    // Calculate progress based on case strength and evidence completeness
    const strengthProgress = (caseMemory.case_strength_score / 10) * 70; // 70% weight
    const evidenceProgress = caseMemory.evidence_index?.length ? 20 : 0; // 20% weight
    const timelineProgress = caseMemory.timeline_summary ? 10 : 0; // 10% weight
    
    return Math.min(100, strengthProgress + evidenceProgress + timelineProgress);
  };

  const goalProgress = getGoalProgress();

  if (!isGoalLocked || !currentGoal) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Goal Progress Indicator */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <h4 className="text-sm font-medium">Goal Progress</h4>
            <p className="text-xs text-muted-foreground truncate">{currentGoal}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round(goalProgress)}%
          </Badge>
        </div>
        <Progress value={goalProgress} className="h-2" />
        
        {/* Progress Indicators */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span>Case Strength: {caseMemory?.case_strength_score || 0}/10</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-blue-600" />
            <span>Evidence: {caseMemory?.evidence_index?.length || 0} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-purple-600" />
            <span>Timeline: {caseMemory?.timeline_summary ? 'Ready' : 'Pending'}</span>
          </div>
        </div>
      </Card>

      {/* Context-Aware Response Formatting */}
      <div className={`
        ${complexity === 'simple' ? 'space-y-2' : ''}
        ${complexity === 'moderate' ? 'space-y-3' : ''}
        ${complexity === 'complex' ? 'space-y-4' : ''}
      `}>
        {children}
      </div>

      {/* Next Steps Suggestion (for complex cases) */}
      {complexity === 'complex' && goalProgress < 80 && (
        <Card className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Suggested Next Steps
            </span>
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
            {goalProgress < 30 && (
              <p>• Upload key evidence documents to strengthen your case</p>
            )}
            {goalProgress < 60 && (
              <p>• Review timeline for completeness and accuracy</p>
            )}
            {goalProgress < 80 && (
              <p>• Consider consulting with a legal professional for case strategy</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}