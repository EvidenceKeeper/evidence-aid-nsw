import { Button } from "@/components/ui/button";
import { Heart, Calendar, Shield, Target, CheckCircle, ChevronRight } from "lucide-react";

interface TraumaInformedAction {
  id: string;
  text: string;
  action_type: 'safety' | 'choice' | 'micro_step' | 'validation' | 'empowerment';
  priority: 'immediate' | 'gentle' | 'empowering';
}

interface TraumaInformedActionSuggestionsProps {
  content: string;
  onActionClick: (actionText: string) => void;
  userGoal?: string;
}

export function TraumaInformedActionSuggestions({ 
  content, 
  onActionClick, 
  userGoal 
}: TraumaInformedActionSuggestionsProps) {
  
  const extractTraumaInformedActions = (content: string): TraumaInformedAction[] => {
    const actions: TraumaInformedAction[] = [];
    
    // Look for collaborative language patterns
    const choiceMatches = content.match(/(?:Would you like to|What feels right|You might consider).*?([^\.\n]+)/gi);
    if (choiceMatches) {
      choiceMatches.forEach((match, index) => {
        const cleanText = match.replace(/^(Would you like to|What feels right|You might consider)\s*/i, '').trim();
        if (cleanText.length > 10) {
          actions.push({
            id: `choice-${index}`,
            text: cleanText,
            action_type: 'choice',
            priority: 'gentle'
          });
        }
      });
    }
    
    // Look for next steps with trauma-informed framing
    const stepMatches = content.match(/(?:Next step|Small step|You could).*?:\s*(.+?)(?=\n|$)/gi);
    if (stepMatches) {
      stepMatches.forEach((match, index) => {
        const cleanText = match.replace(/^(?:Next step|Small step|You could).*?:\s*/i, '').trim();
        if (cleanText.length > 10) {
          actions.push({
            id: `step-${index}`,
            text: cleanText,
            action_type: 'micro_step',
            priority: index === 0 ? 'immediate' : 'gentle'
          });
        }
      });
    }
    
    // Look for empowerment language
    const empowerMatches = content.match(/(?:Your strength|You've already|You're capable).*?([^\.\n]+)/gi);
    if (empowerMatches) {
      empowerMatches.forEach((match, index) => {
        actions.push({
          id: `empower-${index}`,
          text: match.trim(),
          action_type: 'empowerment',
          priority: 'empowering'
        });
      });
    }
    
    // Add default supportive actions if none found
    if (actions.length === 0) {
      actions.push({
        id: 'default-support',
        text: "Tell me more about what feels most important to you right now",
        action_type: 'validation',
        priority: 'gentle'
      });
    }
    
    return actions.slice(0, 3); // Limit to 3 to reduce cognitive load
  };
  
  const getActionIcon = (type: TraumaInformedAction['action_type']) => {
    switch (type) {
      case 'safety': return <Shield className="h-3 w-3" />;
      case 'choice': return <Target className="h-3 w-3" />;
      case 'micro_step': return <Calendar className="h-3 w-3" />;
      case 'validation': return <Heart className="h-3 w-3" />;
      case 'empowerment': return <CheckCircle className="h-3 w-3" />;
      default: return <ChevronRight className="h-3 w-3" />;
    }
  };
  
  const getPriorityStyle = (priority: TraumaInformedAction['priority']) => {
    switch (priority) {
      case 'immediate': return 'border-primary/50 bg-primary/10 text-primary';
      case 'empowering': return 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400';
      default: return 'border-border/40 bg-background/50 hover:bg-accent/80';
    }
  };
  
  const actions = extractTraumaInformedActions(content);
  
  if (actions.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4 p-3 rounded-lg bg-card/50 border border-border/20">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">What feels right for you?</p>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            onClick={() => onActionClick(action.text)}
            className={`w-full h-auto p-3 text-sm font-normal justify-start gap-2 text-left ${getPriorityStyle(action.priority)}`}
          >
            {getActionIcon(action.action_type)}
            <span className="flex-1 text-left leading-relaxed">{action.text}</span>
          </Button>
        ))}
      </div>
      {userGoal && (
        <div className="mt-3 pt-2 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            🎯 Working towards: {userGoal}
          </p>
        </div>
      )}
    </div>
  );
}