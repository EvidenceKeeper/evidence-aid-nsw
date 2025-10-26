import { useCasePlan } from '@/hooks/useCasePlan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MilestoneProgress() {
  const { casePlan, currentMilestone, milestoneProgress, loading } = useCasePlan();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!casePlan) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            No Active Plan
          </CardTitle>
          <CardDescription className="text-xs">
            Complete onboarding to create your case plan
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const milestones = (casePlan.milestones || []) as any[];
  const currentProgress = milestoneProgress.find(
    (p) => p.milestone_index === casePlan.current_milestone_index
  );

  const getStatusIcon = (index: number) => {
    const progress = milestoneProgress.find((p) => p.milestone_index === index);
    
    if (progress?.status === 'complete') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    
    if (index === casePlan.current_milestone_index) {
      return <Clock className="h-4 w-4 text-primary animate-pulse" />;
    }
    
    return <Circle className="h-3 w-3 text-muted-foreground" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      evidence: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      legal: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      safety: 'bg-red-500/10 text-red-700 dark:text-red-300',
      documentation: 'bg-green-500/10 text-green-700 dark:text-green-300',
      preparation: 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      {/* Overall Progress Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Case Goal
              </CardTitle>
              <p className="text-sm font-medium mt-2 line-clamp-2">
                {casePlan.primary_goal}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {casePlan.overall_progress_percentage}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Progress value={casePlan.overall_progress_percentage} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Milestone {casePlan.current_milestone_index + 1} of {milestones.length}
          </div>
        </CardContent>
      </Card>

      {/* Current Milestone Card */}
      {currentMilestone && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                  <Badge className={`text-xs ${getCategoryColor(currentMilestone.category)}`}>
                    {currentMilestone.category}
                  </Badge>
                </div>
                <CardTitle className="text-sm">
                  {currentMilestone.title}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {currentMilestone.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Progress value={currentProgress?.completion_percentage || 0} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {currentProgress?.completion_percentage || 0}% complete
            </div>
            
            {/* Success Criteria Checklist */}
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-medium">Success Criteria:</p>
              <ul className="space-y-1">
                {currentMilestone.success_criteria?.slice(0, 3).map((criteria: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary flex-shrink-0 mt-0.5">•</span>
                    <span className="line-clamp-2">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Milestones List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium">All Milestones</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {milestones.map((milestone, index) => {
              const progress = milestoneProgress.find((p) => p.milestone_index === index);
              const isCurrent = index === casePlan.current_milestone_index;
              const isComplete = progress?.status === 'complete';
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-primary/10' : isComplete ? 'bg-muted/50' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium line-clamp-1 ${
                      isComplete ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {milestone.title}
                    </p>
                    {isCurrent && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress?.completion_percentage || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {progress?.completion_percentage || 0}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Next Milestone Preview */}
      {casePlan.current_milestone_index < milestones.length - 1 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              Next Up
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {milestones[casePlan.current_milestone_index + 1]?.title}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}