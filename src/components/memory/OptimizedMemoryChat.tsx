import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Clock, Target, TrendingUp, Calendar, User, Settings } from "lucide-react";
import { useUnifiedMemory } from "./UnifiedMemoryProvider";

interface OptimizedMemoryChatProps {
  onSendMessage: (message: string) => void;
  userQuery: string;
}

interface ProactiveContext {
  timeline_context: string;
  person_appearances: string;
  case_strength_change: string;
  evidence_announcement: string;
}

export function OptimizedMemoryChat({ onSendMessage, userQuery }: OptimizedMemoryChatProps) {
  const { 
    caseMemory, 
    settings, 
    runProactiveMemoryTriggers, 
    getContextualSuggestions,
    updateSettings,
    caseStrength 
  } = useUnifiedMemory();
  
  const [proactiveContext, setProactiveContext] = useState<ProactiveContext | null>(null);
  const [showProactiveCards, setShowProactiveCards] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (userQuery && userQuery.length > 5 && settings.proactiveTriggersActive) {
      handleProactiveMemory(userQuery);
    }
  }, [userQuery, settings.proactiveTriggersActive]);

  const handleProactiveMemory = async (query: string) => {
    const context = await runProactiveMemoryTriggers(query, []);
    if (context && (context.timeline_context || context.person_appearances || context.case_strength_change)) {
      setProactiveContext(context);
      setShowProactiveCards(true);
    }
  };

  const renderMemorySettings = () => {
    if (!showSettings) return null;

    return (
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Memory Settings</div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSettings(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">Proactive Triggers</span>
              <Button
                variant={settings.proactiveTriggersActive ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => updateSettings({ proactiveTriggersActive: !settings.proactiveTriggersActive })}
              >
                {settings.proactiveTriggersActive ? "ON" : "OFF"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">Vector Search</span>
              <Button
                variant={settings.vectorSearchActive ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => updateSettings({ vectorSearchActive: !settings.vectorSearchActive })}
              >
                {settings.vectorSearchActive ? "ON" : "OFF"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">Case Monitoring</span>
              <Button
                variant={settings.caseStrengthMonitoring ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => updateSettings({ caseStrengthMonitoring: !settings.caseStrengthMonitoring })}
              >
                {settings.caseStrengthMonitoring ? "ON" : "OFF"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">Communication Style</span>
              <select 
                className="text-xs border rounded px-2 py-1"
                value={settings.communicationStyle}
                onChange={(e) => updateSettings({ communicationStyle: e.target.value as any })}
              >
                <option value="gentle">Gentle</option>
                <option value="direct">Direct</option>
                <option value="collaborative">Collaborative</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  Status: {caseMemory.goal_status || 'Active'}
                </Badge>
                {settings.caseStrengthMonitoring && (
                  <Badge variant="outline" className="text-xs">
                    Strength: {caseStrength.score}/10
                  </Badge>
                )}
              </div>
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
    if (!proactiveContext || !showProactiveCards || !settings.proactiveTriggersActive) return null;

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

        {proactiveContext.case_strength_change && settings.caseStrengthMonitoring && (
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
    const suggestions = getContextualSuggestions(userQuery);

    return suggestions.length > 0 ? (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">
            Smart Suggestions:
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
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
      {renderMemorySettings()}
      {renderGoalCard()}
      {renderThreadSummaryCard()}
      {renderProactiveContextCards()}
      {renderMemoryAwareSuggestions()}
    </div>
  );
}