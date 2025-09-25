import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Calendar, 
  FileText, 
  Target, 
  TrendingUp, 
  BookOpen,
  CheckCircle,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QuickReply {
  id: string;
  text: string;
  displayText: string;
  icon: React.ReactNode;
  category: 'continuation' | 'progress' | 'action' | 'analysis' | 'summary';
  priority: number;
  contextData?: any;
  requiresProcessing: boolean;
}

interface IntelligentQuickRepliesProps {
  onReplySelect: (reply: QuickReply) => void;
  conversationContext: any;
  caseMemory: any;
  isLoading?: boolean;
}

export function IntelligentQuickReplies({ 
  onReplySelect, 
  conversationContext, 
  caseMemory,
  isLoading = false 
}: IntelligentQuickRepliesProps) {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    generateContextualReplies();
  }, [conversationContext, caseMemory]);

  const generateContextualReplies = async () => {
    const replies: QuickReply[] = [];

    // 1. CONTINUATION REPLIES (highest priority)
    if (conversationContext?.unfinishedBusiness?.length > 0) {
      replies.push({
        id: 'continue-last',
        text: `Continue with: ${conversationContext.unfinishedBusiness[0]}`,
        displayText: 'Continue Where We Left Off',
        icon: <ArrowRight className="h-4 w-4" />,
        category: 'continuation',
        priority: 10,
        requiresProcessing: true
      });
    }

    if (conversationContext?.conversationGaps > 24) {
      replies.push({
        id: 'catch-up',
        text: 'Give me a quick recap of my case progress and what we discussed last time',
        displayText: 'Catch Me Up',
        icon: <RotateCcw className="h-4 w-4" />,
        category: 'continuation',
        priority: 9,
        requiresProcessing: true
      });
    }

    // 2. PROGRESS-ORIENTED REPLIES
    if (caseMemory?.primary_goal) {
      replies.push({
        id: 'goal-progress',
        text: `How is my progress toward: ${caseMemory.primary_goal}`,
        displayText: 'Check Goal Progress',
        icon: <Target className="h-4 w-4" />,
        category: 'progress',
        priority: 8,
        contextData: { goal: caseMemory.primary_goal },
        requiresProcessing: true
      });
    }

    if (caseMemory?.case_strength_score) {
      replies.push({
        id: 'strengthen-case',
        text: 'What specific actions would boost my case strength the most right now?',
        displayText: 'Strengthen My Case',
        icon: <TrendingUp className="h-4 w-4" />,
        category: 'action',
        priority: 7,
        contextData: { currentStrength: caseMemory.case_strength_score },
        requiresProcessing: true
      });
    }

    // 3. SMART ACTION REPLIES based on current stage
    const currentStage = caseMemory?.current_stage || 1;
    
    if (currentStage <= 3) {
      replies.push({
        id: 'upload-evidence',
        text: 'I have new documents to upload and analyze',
        displayText: 'Upload New Evidence',
        icon: <FileText className="h-4 w-4" />,
        category: 'action',
        priority: 6,
        requiresProcessing: false // This triggers file upload UI
      });
    }

    if (currentStage >= 4) {
      replies.push({
        id: 'timeline-review',
        text: 'Review my timeline and check for any gaps or inconsistencies',
        displayText: 'Review Timeline',
        icon: <Calendar className="h-4 w-4" />,
        category: 'analysis',
        priority: 6,
        requiresProcessing: true
      });
    }

    // 4. ANALYSIS & INSIGHTS
    replies.push({
      id: 'case-summary',
      text: 'Give me a comprehensive 6-line summary of my case right now',
      displayText: 'Case Overview',
      icon: <BookOpen className="h-4 w-4" />,
      category: 'summary',
      priority: 5,
      requiresProcessing: true
    });

    if (caseMemory?.evidence_index?.length > 0) {
      replies.push({
        id: 'evidence-patterns',
        text: 'What patterns and connections do you see across all my evidence?',
        displayText: 'Analyze Patterns',
        icon: <Zap className="h-4 w-4" />,
        category: 'analysis',
        priority: 5,
        requiresProcessing: true
      });
    }

    // 5. STAGE-SPECIFIC QUICK ACTIONS
    await addStageSpecificReplies(replies, currentStage);

    // Sort by priority and limit to top 6
    replies.sort((a, b) => b.priority - a.priority);
    setQuickReplies(replies.slice(0, 6));
  };

  const addStageSpecificReplies = async (replies: QuickReply[], stage: number) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      switch (stage) {
        case 1: // Awareness
          replies.push({
            id: 'stage-1-help',
            text: 'I need help understanding my legal options and what steps to take first',
            displayText: 'Explore My Options',
            icon: <BookOpen className="h-4 w-4" />,
            category: 'action',
            priority: 7,
            requiresProcessing: true
          });
          break;

        case 2: // Information Gathering
          replies.push({
            id: 'stage-2-organize',
            text: 'Help me organize and document all the key facts of my situation',
            displayText: 'Organize Key Facts',
            icon: <CheckCircle className="h-4 w-4" />,
            category: 'action',
            priority: 7,
            requiresProcessing: true
          });
          break;

        case 5: // Strategy Planning
          replies.push({
            id: 'stage-5-strategy',
            text: 'Show me strategic options for my next steps with realistic timelines',
            displayText: 'Plan Next Steps',
            icon: <Clock className="h-4 w-4" />,
            category: 'action',
            priority: 7,
            requiresProcessing: true
          });
          break;
      }
    } catch (error) {
      console.error('Error adding stage-specific replies:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'continuation': return 'bg-primary/10 text-primary border-primary/20';
      case 'progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'action': return 'bg-green-50 text-green-700 border-green-200';
      case 'analysis': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'summary': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleReplyClick = (reply: QuickReply) => {
    onReplySelect(reply);
  };

  if (quickReplies.length === 0 || isLoading) {
    return (
      <div className="space-y-2 opacity-50">
        <div className="text-xs font-medium text-muted-foreground">Smart Replies</div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Smart Replies
        </div>
        <Badge variant="secondary" className="text-xs">
          {quickReplies.length} available
        </Badge>
      </div>

      <div className="space-y-2">
        {quickReplies.map((reply) => (
          <Button
            key={reply.id}
            variant="outline"
            size="sm"
            onClick={() => handleReplyClick(reply)}
            className={`h-auto p-3 justify-start gap-2 text-left transition-all hover:scale-[1.02] ${getCategoryColor(reply.category)}`}
          >
            <div className="flex items-center gap-2 flex-1">
              {reply.icon}
              <div className="flex-1">
                <div className="font-medium text-xs">
                  {reply.displayText}
                </div>
                {reply.contextData && (
                  <div className="text-xs opacity-70 mt-1">
                    {reply.category === 'progress' && reply.contextData.goal && 
                      `Goal: ${reply.contextData.goal.slice(0, 40)}...`
                    }
                    {reply.category === 'action' && reply.contextData.currentStrength &&
                      `Current strength: ${Math.round(reply.contextData.currentStrength * 10)}%`
                    }
                  </div>
                )}
              </div>
              <ArrowRight className="h-3 w-3 opacity-50" />
            </div>
          </Button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground/70 text-center">
        These suggestions adapt to your case progress and conversation history
      </div>
    </div>
  );
}