import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface TimelineEvent {
  id: string;
  event_date: string;
  category: string;
  confidence: number;
  verified: boolean;
}

interface TimelineGapAnalysisProps {
  events: TimelineEvent[];
  userGoal?: string;
}

const getRecommendedCategories = (goal?: string) => {
  const recommendations = {
    custody: ['child_welfare', 'communication', 'medical', 'incident'],
    avo: ['incident', 'threat', 'coercive_control', 'communication'],
    divorce: ['financial', 'property', 'communication', 'incident'],
    default: ['communication', 'incident', 'document']
  };

  if (!goal) return recommendations.default;
  
  const goalKey = goal.toLowerCase().includes('custody') ? 'custody' :
                 goal.toLowerCase().includes('avo') || goal.toLowerCase().includes('violence') ? 'avo' :
                 goal.toLowerCase().includes('divorce') || goal.toLowerCase().includes('separation') ? 'divorce' :
                 'default';
  
  return recommendations[goalKey];
};

export function TimelineGapAnalysis({ events, userGoal }: TimelineGapAnalysisProps) {
  if (events.length === 0) return null;

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  // Find gaps between events
  const gaps = [];
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const currentEvent = sortedEvents[i];
    const nextEvent = sortedEvents[i + 1];
    const daysBetween = differenceInDays(
      parseISO(nextEvent.event_date),
      parseISO(currentEvent.event_date)
    );

    if (daysBetween > 30) { // Gap of more than 30 days
      gaps.push({
        start: currentEvent.event_date,
        end: nextEvent.event_date,
        days: daysBetween,
        categories: getRecommendedCategories(userGoal)
      });
    }
  }

  // Analyze evidence density by category
  const categoryDensity = events.reduce((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getGapSeverity = (days: number) => {
    if (days > 90) return { level: 'high', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
    if (days > 60) return { level: 'medium', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' };
    return { level: 'low', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' };
  };

  const getCategoryStrength = (category: string, count: number) => {
    const total = events.length;
    const percentage = (count / total) * 100;
    
    if (percentage > 30) return { strength: 'strong', color: 'text-green-600', bg: 'bg-green-100' };
    if (percentage > 15) return { strength: 'moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { strength: 'weak', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const missingCategories = getRecommendedCategories(userGoal).filter(
    cat => !categoryDensity[cat] || categoryDensity[cat] < 2
  );

  return (
    <div className="space-y-4">
      {/* Timeline Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <CardTitle className="text-sm">Timeline Gaps</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps.slice(0, 3).map((gap, index) => {
              const severity = getGapSeverity(gap.days);
              return (
                <Alert key={index} className={severity.bg}>
                  <AlertTriangle className={`h-4 w-4 ${severity.color}`} />
                  <AlertDescription className="text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {format(parseISO(gap.start), 'MMM dd')} - {format(parseISO(gap.end), 'MMM dd, yyyy')}
                      </span>
                      <Badge variant="outline" className={severity.color}>
                        {gap.days} day gap
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consider adding evidence for: {gap.categories.join(', ')}
                    </p>
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Evidence Density by Category */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm">Evidence Strength</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(categoryDensity).map(([category, count]) => {
            const strength = getCategoryStrength(category, count);
            return (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{count} events</span>
                  <Badge className={`text-xs ${strength.bg} ${strength.color}`}>
                    {strength.strength}
                  </Badge>
                </div>
              </div>
            );
          })}
          
          {missingCategories.length > 0 && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Missing evidence types:</strong> {missingCategories.join(', ')}
                <p className="text-xs text-muted-foreground mt-1">
                  Upload evidence in these categories to strengthen your case
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}