import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Calendar, FileSearch, Zap, Target, BarChart3, Sparkles } from "lucide-react";

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
    switch (type) {
      case 'timeline': return <Calendar className="h-5 w-5" />;
      case 'analysis': return <FileSearch className="h-5 w-5" />;
      case 'evidence': return <Zap className="h-5 w-5" />;
      case 'summary': return <BarChart3 className="h-5 w-5" />;
      case 'strategy': return <Target className="h-5 w-5" />;
      default: return <ChevronRight className="h-5 w-5" />;
    }
  };

  const getActionGradient = (type: SuggestedAction['action_type']) => {
    switch (type) {
      case 'timeline': return 'from-blue-600/20 to-cyan-600/20 border-blue-600/30 hover:border-blue-600/50';
      case 'analysis': return 'from-purple-600/20 to-pink-600/20 border-purple-600/30 hover:border-purple-600/50';
      case 'evidence': return 'from-green-600/20 to-emerald-600/20 border-green-600/30 hover:border-green-600/50';
      case 'summary': return 'from-orange-600/20 to-yellow-600/20 border-orange-600/30 hover:border-orange-600/50';
      case 'strategy': return 'from-indigo-600/20 to-violet-600/20 border-indigo-600/30 hover:border-indigo-600/50';
      default: return 'from-primary/20 to-primary/10 border-primary/30 hover:border-primary/50';
    }
  };

  const getActionIconColor = (type: SuggestedAction['action_type']) => {
    switch (type) {
      case 'timeline': return 'text-blue-600';
      case 'analysis': return 'text-purple-600';
      case 'evidence': return 'text-green-600';
      case 'summary': return 'text-orange-600';
      case 'strategy': return 'text-indigo-600';
      default: return 'text-primary';
    }
  };
  
  const actions = extractActions(content);
  
  if (actions.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4 pt-4 border-t border-border/20 space-y-3" role="region" aria-label="Suggested actions">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold">Suggested Actions</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
        {actions.map((action, index) => (
          <Card
            key={action.id}
            role="listitem"
            tabIndex={0}
            className={`group cursor-pointer transition-all duration-300 border-2 bg-gradient-to-br ${getActionGradient(action.action_type)} hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              action.priority === 'high' ? 'ring-2 ring-primary/20 ring-offset-2' : ''
            }`}
            onClick={() => onActionClick(action.text)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActionClick(action.text);
              }
            }}
            aria-label={`Suggested action ${index + 1}: ${action.text}${action.priority === 'high' ? ' (Recommended)' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl bg-background/80 backdrop-blur-sm ${getActionIconColor(action.action_type)} group-hover:scale-110 transition-transform duration-300`} aria-hidden="true">
                  {getActionIcon(action.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                    {action.text}
                  </p>
                  {action.priority === 'high' && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        Recommended
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}