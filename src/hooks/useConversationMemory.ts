import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConversationThread {
  id: string;
  user_id: string;
  thread_title: string;
  last_message_at: string;
  message_count: number;
  status: 'active' | 'paused' | 'completed';
  topics: string[];
  primary_goal: string;
  progress_indicators: {
    stage: number;
    key_achievements: string[];
    next_actions: string[];
  };
  conversation_summary: string;
  created_at: string;
  updated_at: string;
}

interface ConversationContext {
  previousGoal: string | null;
  lastTopics: string[];
  progressMade: string[];
  unfinishedBusiness: string[];
  conversationGaps: number; // hours since last interaction
}

export function useConversationMemory() {
  const [currentThread, setCurrentThread] = useState<ConversationThread | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const { toast } = useToast();

  // Create mock thread for now
  const initializeThread = useCallback(async () => {
    setIsLoadingThread(true);
    try {
      // Create mock thread
      const mockThread: ConversationThread = {
        id: 'mock-thread-id',
        user_id: 'mock-user-id',
        thread_title: 'Legal Case Discussion',
        last_message_at: new Date().toISOString(),
        message_count: 1,
        status: 'active',
        topics: ['coercive control', 'evidence'],
        primary_goal: 'Build evidence for coercive control case',
        progress_indicators: {
          stage: 1,
          key_achievements: ['Initial consultation'],
          next_actions: ['Gather evidence']
        },
        conversation_summary: 'User is building a case for coercive control',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setCurrentThread(mockThread);
      
      // Create mock context
      const mockContext: ConversationContext = {
        previousGoal: 'Build evidence for coercive control case',
        lastTopics: ['coercive control', 'evidence'],
        progressMade: ['Initial case assessment'],
        unfinishedBusiness: ['Upload evidence documents'],
        conversationGaps: 0
      };
      
      setConversationContext(mockContext);
    } catch (error) {
      console.error('Failed to initialize conversation thread:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  // Mock update function
  const updateThread = useCallback(async (updates: Partial<ConversationThread>) => {
    if (!currentThread) return;
    // Just update local state for now
    setCurrentThread(prev => prev ? { ...prev, ...updates } : null);
  }, [currentThread]);

  // Create conversation summary from messages
  const generateConversationSummary = useCallback(async (messages: any[]) => {
    if (!currentThread || messages.length === 0) return;

    try {
      const recentMessages = messages.slice(-10); // Last 10 messages
      const conversationText = recentMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      // Call edge function to generate intelligent summary
      const { data, error } = await supabase.functions.invoke('conversation-summarizer', {
        body: {
          threadId: currentThread.id,
          conversationText,
          currentGoal: conversationContext?.previousGoal
        }
      });

      if (!error && data) {
        await updateThread({
          conversation_summary: data.summary,
          topics: data.detectedTopics,
          progress_indicators: {
            ...currentThread.progress_indicators,
            key_achievements: data.achievements,
            next_actions: data.nextActions
          }
        });
      }
    } catch (error) {
      console.error('Failed to generate conversation summary:', error);
    }
  }, [currentThread, conversationContext, updateThread]);

  // Get conversation continuity message for returning users
  const getContinuityMessage = useCallback(() => {
    if (!conversationContext || !currentThread) return null;

    const { conversationGaps, previousGoal, progressMade, unfinishedBusiness } = conversationContext;

    if (conversationGaps < 1) {
      return "Let's continue where we left off.";
    } else if (conversationGaps < 24) {
      return `Welcome back! We were working on ${previousGoal || 'your legal matter'}. ${
        progressMade.length > 0 ? `Progress made: ${progressMade[0]}. ` : ''
      }${unfinishedBusiness.length > 0 ? `Next: ${unfinishedBusiness[0]}` : ''}`;
    } else if (conversationGaps < 168) { // 1 week
      return `Good to see you again! Let me catch you up on where we were: ${
        currentThread.conversation_summary || 'We were working on building your legal case.'
      } Would you like to continue from there or start fresh?`;
    } else {
      return `Welcome back! It's been a while since our last conversation. I still have your case information saved. Would you like me to give you a quick recap of your progress, or would you prefer to start with something new?`;
    }
  }, [conversationContext, currentThread]);

  useEffect(() => {
    initializeThread();
  }, [initializeThread]);

  return {
    currentThread,
    conversationContext,
    isLoadingThread,
    updateThread,
    generateConversationSummary,
    getContinuityMessage,
    initializeThread
  };
}