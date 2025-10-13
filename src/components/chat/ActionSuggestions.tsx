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
    
    // Pattern 1: "Would you prefer/Which would you like to focus on" with numbered options
    const preferenceMatch = content.match(/(?:Would you prefer to|You can|Let me know which|Choose one|Which would you like to focus on|What would you like to focus on|Which option).*?:\s*\n((?:\d+\.\s*\*?\*?[^\n]+\n?)+)/is);
    if (preferenceMatch) {
      const optionsText = preferenceMatch[1];
      const optionMatches = optionsText.match(/\d+\.\s*\*?\*?(.+?)(?=\d+\.|$)/gs);
      
      if (optionMatches) {
        optionMatches.forEach((match, index) => {
          // Remove number, asterisks, and clean text
          let text = match.replace(/^\d+\.\s*\*?\*?/, '').replace(/\*?\*?$/, '').trim();
          // Remove the option number from the text itself
          text = text.replace(/^Option \d+:\s*/i, '');
          
          if (text.length > 10) {
            actions.push({
              id: `option-${index}`,
              text: text,
              action_type: determineActionType(text),
              priority: index === 0 ? 'high' : 'medium'
            });
          }
        });
      }
    }
    
    // Pattern 2: Parenthesis format "1) Option"
    if (actions.length === 0) {
      const parenListMatch = content.match(/(?:^|\n)(\d+\)\s*.+(?:\n\d+\)\s*.+)+)/m);
      if (parenListMatch) {
        const optionMatches = parenListMatch[1].match(/\d+\)\s*(.+?)(?=\d+\)|$)/gs);
        if (optionMatches && optionMatches.length >= 2) {
          optionMatches.forEach((match, index) => {
            const text = match.replace(/^\d+\)\s*/, '').trim();
            if (text.length > 10) {
              actions.push({
                id: `paren-${index}`,
                text: text,
                action_type: determineActionType(text),
                priority: index === 0 ? 'high' : 'medium'
              });
            }
          });
        }
      }
    }
    
    // Pattern 3: Standalone numbered lists (at least 2 consecutive items)
    if (actions.length === 0) {
      const standaloneListMatch = content.match(/(?:^|\n)(\d+\.\s*.+(?:\n\d+\.\s*.+)+)/m);
      if (standaloneListMatch) {
        const optionMatches = standaloneListMatch[1].match(/\d+\.\s*(.+?)(?=\d+\.|$)/gs);
        if (optionMatches && optionMatches.length >= 2) {
          optionMatches.forEach((match, index) => {
            const text = match.replace(/^\d+\.\s*/, '').trim();
            if (text.length > 10) {
              actions.push({
                id: `standalone-${index}`,
                text: text,
                action_type: determineActionType(text),
                priority: index === 0 ? 'high' : 'medium'
              });
            }
          });
        }
      }
    }
    
    // Pattern 4: "Next steps" sections
    if (actions.length === 0) {
      const nextStepsMatch = content.match(/Next steps.*?:(.*?)(?:\n\n|$)/is);
      if (nextStepsMatch) {
        const stepsText = nextStepsMatch[1];
        
        // Extract numbered or bulleted actions
        const actionMatches = stepsText.match(/(?:^\s*(?:\d+\.|\-|\•)\s*)(.+?)(?=\n|$)/gm);
        if (actionMatches) {
          actionMatches.forEach((match, index) => {
            const text = match.replace(/^\s*(?:\d+\.|\-|\•)\s*/, '').trim();
            if (text.length > 10) {
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
    }
    
    // Pattern 5: Button-style suggestions (like "– Yes, add incidents to my timeline")
    if (actions.length === 0) {
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
    }
    
    return actions.slice(0, 6); // Allow up to 6 actions
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
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground/90">
          {actions.length === 2 ? 'Choose one:' : 'Choose your next step:'}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
        {actions.map((action, index) => (
          <Card
            key={action.id}
            role="listitem"
            tabIndex={0}
            className={`
              group cursor-pointer transition-all duration-200 
              border-2 rounded-xl
              bg-gradient-to-br ${getActionGradient(action.action_type)} 
              hover:scale-[1.02] hover:shadow-md active:scale-[0.98]
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
              animate-in fade-in slide-in-from-bottom-2 duration-500
              ${action.priority === 'high' ? 'ring-2 ring-primary/30' : ''}
            `}
            style={{ animationDelay: `${index * 75}ms` }}
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
              <div className="flex items-center gap-3">
                <div className={`
                  p-2.5 rounded-xl bg-background/90 backdrop-blur-sm 
                  ${getActionIconColor(action.action_type)} 
                  group-hover:scale-110 transition-transform duration-200
                `} aria-hidden="true">
                  {getActionIcon(action.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                    {action.text}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}