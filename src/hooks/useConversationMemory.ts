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

  // Load or create conversation thread
  const initializeThread = useCallback(async () => {
    setIsLoadingThread(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      // Try to find active thread
      const { data: activeThread } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeThread) {
        setCurrentThread(activeThread);
        await generateConversationContext(activeThread);
      } else {
        // Create new thread
        const { data: newThread } = await supabase
          .from('conversation_threads')
          .insert({
            user_id: sessionData.session.user.id,
            thread_title: 'New Legal Journey',
            topics: [],
            primary_goal: '',
            progress_indicators: {
              stage: 1,
              key_achievements: [],
              next_actions: []
            },
            conversation_summary: ''
          })
          .select()
          .single();

        if (newThread) {
          setCurrentThread(newThread);
        }
      }
    } catch (error) {
      console.error('Failed to initialize conversation thread:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, []);

  // Generate contextual information about conversation continuity
  const generateConversationContext = async (thread: ConversationThread) => {
    try {
      const lastMessageTime = new Date(thread.last_message_at);
      const now = new Date();
      const hoursGap = Math.floor((now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60));

      // Get case memory for goal context
      const { data: caseMemory } = await supabase
        .from('case_memory')
        .select('primary_goal, key_facts, timeline_summary, case_strength_score')
        .eq('user_id', thread.user_id)
        .maybeSingle();

      // Get recent progress from case analysis history
      const { data: recentProgress } = await supabase
        .from('case_analysis_history')
        .select('key_insights, analysis_type')
        .eq('user_id', thread.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      const context: ConversationContext = {
        previousGoal: caseMemory?.primary_goal || thread.primary_goal || null,
        lastTopics: thread.topics || [],
        progressMade: recentProgress?.map(p => p.key_insights?.[0]).filter(Boolean) || [],
        unfinishedBusiness: thread.progress_indicators?.next_actions || [],
        conversationGaps: hoursGap
      };

      setConversationContext(context);
    } catch (error) {
      console.error('Failed to generate conversation context:', error);
    }
  };

  // Update thread with new information
  const updateThread = useCallback(async (updates: Partial<ConversationThread>) => {
    if (!currentThread) return;

    try {
      const { data: updatedThread } = await supabase
        .from('conversation_threads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentThread.id)
        .select()
        .single();

      if (updatedThread) {
        setCurrentThread(updatedThread);
      }
    } catch (error) {
      console.error('Failed to update conversation thread:', error);
    }
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