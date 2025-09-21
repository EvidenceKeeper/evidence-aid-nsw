import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface SuggestedAction {
  id: string;
  text: string;
  action_type: 'analysis' | 'timeline' | 'strategy' | 'evidence' | 'summary';
  priority: 'high' | 'medium' | 'low';
}

interface ActionSuggestionsProps {
  content: string;
  onActionClick: (actionText: string) => void;
}

export function ActionSuggestions({ content, onActionClick }: ActionSuggestionsProps) {
  // Extract structured action suggestions from assistant content
  const extractActions = (content: string): SuggestedAction[] => {
    const actions: SuggestedAction[] = [];
    
    // Look for "Next steps" or similar sections
    const nextStepsMatch = content.match(/Next steps.*?:(.*?)(?:\n\n|$)/is);
    if (nextStepsMatch) {
      const stepsText = nextStepsMatch[1];
      
      // Extract numbered or bulleted actions
      const actionMatches = stepsText.match(/(?:^\s*(?:\d+\.|\-|\•)\s*)(.+?)(?=\n|$)/gm);
      if (actionMatches) {
        actionMatches.forEach((match, index) => {
          const text = match.replace(/^\s*(?:\d+\.|\-|\•)\s*/, '').trim();
          if (text.length > 10) { // Filter out very short actions
            actions.push({
              id: `action-${index}`,
              text: text,
              action_type: determineActionType(text),
              priority: index === 0 ? 'high' : 'medium'
            });
          }
        });
      }
    }
    
    // Look for button-style suggestions (like "– Yes, add incidents to my timeline")
    const buttonMatches = content.match(/–\s*(.+?)(?=\n|$)/gm);
    if (buttonMatches) {
      buttonMatches.forEach((match, index) => {
        const text = match.replace(/^–\s*/, '').trim();
        if (text.length > 10) {
          actions.push({
            id: `button-${index}`,
            text: text,
            action_type: determineActionType(text),
            priority: 'high'
          });
        }
      });
    }
    
    return actions.slice(0, 4); // Limit to 4 actions max
  };
  
  const determineActionType = (text: string): SuggestedAction['action_type'] => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('timeline') || lowerText.includes('incident') || lowerText.includes('date')) {
      return 'timeline';
    } else if (lowerText.includes('snapshot') || lowerText.includes('summary') || lowerText.includes('overview')) {
      return 'summary';
    } else if (lowerText.includes('evidence') || lowerText.includes('upload') || lowerText.includes('boost')) {
      return 'evidence';
    } else if (lowerText.includes('analyz') || lowerText.includes('review') || lowerText.includes('extract')) {
      return 'analysis';
    } else {
      return 'strategy';
    }
  };
  
  const getActionIcon = (type: SuggestedAction['action_type']) => {
    // Return appropriate Lucide icon component based on type
    return <ChevronRight className="h-3 w-3" />;
  };
  
  const actions = extractActions(content);
  
  if (actions.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Quick actions:</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.text)}
            className="h-auto p-2 text-xs font-normal justify-start gap-1 bg-background/50 hover:bg-accent/80 border-border/40 text-foreground"
          >
            {getActionIcon(action.action_type)}
            <span className="line-clamp-2 text-left">{action.text}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}