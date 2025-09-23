import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Shield, Target, Calendar, FileText, Users } from "lucide-react";

interface CollaborativeChoice {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  supportLevel: 'gentle' | 'moderate' | 'empowering';
}

interface CollaborativeChoiceInterfaceProps {
  onChoiceClick: (action: string) => void;
  userGoal?: string;
  currentContext?: string;
}

export function CollaborativeChoiceInterface({ 
  onChoiceClick, 
  userGoal,
  currentContext 
}: CollaborativeChoiceInterfaceProps) {
  
  const collaborativeChoices: CollaborativeChoice[] = [
    {
      id: 'focus-goal',
      title: 'Focus on my main goal',
      description: 'Let\'s work on what matters most to you right now',
      icon: <Target className="h-4 w-4" />,
      action: `Help me focus on my main goal: ${userGoal || 'clarifying what I want to achieve'}`,
      supportLevel: 'empowering'
    },
    {
      id: 'small-step',
      title: 'Take a small step forward',
      description: 'Something manageable I can do today',
      icon: <Calendar className="h-4 w-4" />,
      action: 'What\'s one small step I could take today that would help my case?',
      supportLevel: 'gentle'
    },
    {
      id: 'organize-evidence',
      title: 'Organize what I have',
      description: 'Make sense of the information and evidence I\'ve gathered',
      icon: <FileText className="h-4 w-4" />,
      action: 'Help me organize and understand the evidence I\'ve collected so far',
      supportLevel: 'moderate'
    },
    {
      id: 'safety-check',
      title: 'Make sure I\'m on the right track',
      description: 'Review my progress and see what\'s working well',
      icon: <Shield className="h-4 w-4" />,
      action: 'Can you review my progress and help me see what I\'ve accomplished?',
      supportLevel: 'empowering'
    },
    {
      id: 'understand-rights',
      title: 'Learn about my rights',
      description: 'Understand what options and protections are available to me',
      icon: <Users className="h-4 w-4" />,
      action: 'Help me understand my legal rights and options in this situation',
      supportLevel: 'moderate'
    },
    {
      id: 'emotional-support',
      title: 'I need encouragement',
      description: 'Remind me of my strengths and progress',
      icon: <Heart className="h-4 w-4" />,
      action: 'I\'m feeling overwhelmed. Can you remind me of the progress I\'ve made?',
      supportLevel: 'gentle'
    }
  ];

  const getSupportLevelStyle = (level: CollaborativeChoice['supportLevel']) => {
    switch (level) {
      case 'gentle': return 'border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900';
      case 'empowering': return 'border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900';
      default: return 'border-border bg-card hover:bg-accent';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <Heart className="h-6 w-6 text-primary mx-auto mb-2" />
        <h3 className="text-lg font-medium text-foreground mb-1">
          What would feel most helpful right now?
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose what feels right for you - there's no wrong answer
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {collaborativeChoices.map((choice) => (
          <Card
            key={choice.id}
            className={`p-4 cursor-pointer transition-all duration-200 ${getSupportLevelStyle(choice.supportLevel)}`}
            onClick={() => onChoiceClick(choice.action)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
                {choice.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">
                  {choice.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {choice.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {userGoal && (
        <div className="mt-6 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Your Goal</span>
          </div>
          <p className="text-sm text-foreground">{userGoal}</p>
        </div>
      )}
    </div>
  );
}