import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Target, 
  ArrowRight, 
  RefreshCw, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationContinuityProps {
  conversationContext: any;
  currentThread: any;
  onContinueConversation: (action: string) => void;
  onStartFresh: () => void;
}

export function ConversationContinuity({ 
  conversationContext, 
  currentThread, 
  onContinueConversation,
  onStartFresh 
}: ConversationContinuityProps) {
  const [showFullSummary, setShowFullSummary] = useState(false);

  if (!conversationContext || !currentThread) {
    return null;
  }

  const { conversationGaps, previousGoal, progressMade, unfinishedBusiness } = conversationContext;

  // Don't show continuity banner for very recent conversations (< 1 hour)
  if (conversationGaps < 1) {
    return null;
  }

  const getTimeDescription = () => {
    if (conversationGaps < 24) return 'earlier today';
    if (conversationGaps < 48) return 'yesterday';
    if (conversationGaps < 168) return 'this week';
    if (conversationGaps < 720) return 'this month';
    return 'a while ago';
  };

  const getContinuityUrgency = () => {
    if (conversationGaps < 24) return 'low';
    if (conversationGaps < 168) return 'medium';
    return 'high';
  };

  const urgency = getContinuityUrgency();

  return (
    <Card className={`mb-4 border-l-4 ${
      urgency === 'low' ? 'border-l-blue-500 bg-blue-50/50' :
      urgency === 'medium' ? 'border-l-orange-500 bg-orange-50/50' :
      'border-l-purple-500 bg-purple-50/50'
    }`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Welcome back! We last spoke {getTimeDescription()}.
            </span>
            <Badge variant="secondary" className="text-xs">
              {formatDistanceToNow(new Date(currentThread.last_message_at))} ago
            </Badge>
          </div>

          {/* Previous Goal */}
          {previousGoal && (
            <div className="flex items-start gap-2 p-2 bg-background/50 rounded-md">
              <Target className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-medium text-primary mb-1">
                  Your Active Goal
                </div>
                <div className="text-sm text-muted-foreground">
                  {previousGoal}
                </div>
              </div>
            </div>
          )}

          {/* Progress Made */}
          {progressMade.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-green-50/50 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-medium text-green-700 mb-1">
                  Recent Progress
                </div>
                <div className="text-sm text-green-600">
                  {progressMade[0]}
                  {progressMade.length > 1 && (
                    <span className="text-xs opacity-70">
                      {" "}and {progressMade.length - 1} more items
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Unfinished Business */}
          {unfinishedBusiness.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-orange-50/50 rounded-md">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-medium text-orange-700 mb-1">
                  Next Actions
                </div>
                <div className="text-sm text-orange-600">
                  {unfinishedBusiness[0]}
                  {unfinishedBusiness.length > 1 && (
                    <span className="text-xs opacity-70">
                      {" "}and {unfinishedBusiness.length - 1} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conversation Summary (for longer gaps) */}
          {conversationGaps > 168 && currentThread.conversation_summary && (
            <div className="p-2 bg-background/30 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Conversation Summary
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="text-xs h-6"
                >
                  {showFullSummary ? 'Hide' : 'Show'} Details
                </Button>
              </div>
              
              <div className={`text-sm text-muted-foreground ${!showFullSummary && 'line-clamp-2'}`}>
                {currentThread.conversation_summary}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onContinueConversation(unfinishedBusiness[0] || previousGoal || "Continue our conversation")}
              className="flex-1 h-9"
              variant="default"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue Where We Left Off
            </Button>
            
            <Button
              onClick={onStartFresh}
              variant="outline"
              className="h-9"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Start Fresh
            </Button>
          </div>

          {/* Thread Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/30">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Stage {currentThread.progress_indicators?.stage || 1}
            </div>
            <div>
              {currentThread.message_count || 0} messages
            </div>
            <div>
              {currentThread.topics?.length || 0} topics covered
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}