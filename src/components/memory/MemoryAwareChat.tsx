import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Clock, Target, TrendingUp, Calendar, User } from "lucide-react";
import { useEnhancedMemory } from "@/hooks/useEnhancedMemory";

interface MemoryAwareChatProps {
  onSendMessage: (message: string) => void;
  userQuery: string;
}

interface ProactiveContext {
  timeline_context: string;
  person_appearances: string;
  case_strength_change: string;
  evidence_announcement: string;
}

export function MemoryAwareChat({ onSendMessage, userQuery }: MemoryAwareChatProps) {
  const { caseMemory, runProactiveMemoryTriggers } = useEnhancedMemory();
  const [proactiveContext, setProactiveContext] = useState<ProactiveContext | null>(null);
  const [showProactiveCards, setShowProactiveCards] = useState(false);

  useEffect(() => {
    if (userQuery && userQuery.length > 5) {
      handleProactiveMemory(userQuery);
    }
  }, [userQuery]);

  const handleProactiveMemory = async (query: string) => {
    const context = await runProactiveMemoryTriggers(query, []);
    if (context && (context.timeline_context || context.person_appearances || context.case_strength_change)) {
      setProactiveContext(context);
      setShowProactiveCards(true);
    }
  };

  const renderGoalCard = () => {
    if (!caseMemory?.primary_goal) return null;

    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-primary mb-1">
                Your Case Goal
              </div>
              <p className="text-xs text-muted-foreground">
                {caseMemory.primary_goal}
              </p>
              <Badge variant="secondary" className="text-xs mt-2">
                Status: {caseMemory.goal_status || 'Active'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderThreadSummaryCard = () => {
    if (!caseMemory?.thread_summary) return null;

    return (
      <Card className="bg-muted/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Recent Discussion
              </div>
              <p className="text-xs text-muted-foreground">
                {caseMemory.thread_summary}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderProactiveContextCards = () => {
    if (!proactiveContext || !showProactiveCards) return null;

    return (
      <div className="space-y-2">
        {proactiveContext.timeline_context && (
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-blue-700 mb-1">
                    Timeline Context
                  </div>
                  <div className="text-xs text-blue-600 whitespace-pre-line">
                    {proactiveContext.timeline_context}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 mt-2"
                    onClick={() => onSendMessage("Tell me more about these timeline events")}
                  >
                    Explore Timeline →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {proactiveContext.person_appearances && (
          <Card className="bg-purple-50/50 border-purple-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-purple-700 mb-1">
                    Person References
                  </div>
                  <div className="text-xs text-purple-600 whitespace-pre-line">
                    {proactiveContext.person_appearances}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 mt-2"
                    onClick={() => onSendMessage("Analyze the pattern of interactions with this person")}
                  >
                    Analyze Pattern →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {proactiveContext.case_strength_change && (
          <Card className="bg-green-50/50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-green-700 mb-1">
                    Case Strength Update
                  </div>
                  <div className="text-xs text-green-600 whitespace-pre-line">
                    {proactiveContext.case_strength_change}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 mt-2"
                    onClick={() => onSendMessage("What can I do to strengthen my case further?")}
                  >
                    Get Recommendations →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {proactiveContext.evidence_announcement && (
          <Card className="bg-orange-50/50 border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-orange-700 mb-1">
                    New Evidence Analysis
                  </div>
                  <div className="text-xs text-orange-600 whitespace-pre-line">
                    {proactiveContext.evidence_announcement}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 mt-2"
                    onClick={() => onSendMessage("Show me the key insights from my latest evidence")}
                  >
                    View Insights →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-xs w-full"
          onClick={() => setShowProactiveCards(false)}
        >
          Hide Context Cards
        </Button>
      </div>
    );
  };

  const renderMemoryAwareSuggestions = () => {
    const suggestions = [];

    if (caseMemory?.primary_goal) {
      suggestions.push(
        `How does my latest evidence support my goal to ${caseMemory.primary_goal}?`
      );
    }

    if (caseMemory?.evidence_index?.length > 0) {
      suggestions.push(
        `What patterns do you see across all my evidence?`
      );
    }

    if (caseMemory?.case_strength_score && caseMemory.case_strength_score < 70) {
      suggestions.push(
        `What specific actions would boost my case strength the most?`
      );
    }

    return suggestions.length > 0 ? (
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">
          Memory-Aware Suggestions:
        </div>
        {suggestions.slice(0, 2).map((suggestion, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="text-xs h-auto p-2 text-left whitespace-normal"
            onClick={() => onSendMessage(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    ) : null;
  };

  return (
    <div className="space-y-3">
      {renderGoalCard()}
      {renderThreadSummaryCard()}
      {renderProactiveContextCards()}
      {renderMemoryAwareSuggestions()}
    </div>
  );
}