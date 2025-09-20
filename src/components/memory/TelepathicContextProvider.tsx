import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useEnhancedMemory } from '@/hooks/useEnhancedMemory';
import { useToast } from '@/hooks/use-toast';

interface TelepathicAnnouncementBanner {
  type: 'evidence_processed' | 'case_strength_update' | 'timeline_update' | 'contradiction_alert' | 'email_corpus';
  title: string;
  content: string;
  action?: string;
  timestamp: Date;
  dismissed?: boolean;
}

interface TelepathicContextType {
  announcements: TelepathicAnnouncementBanner[];
  addAnnouncement: (announcement: Omit<TelepathicAnnouncementBanner, 'timestamp'>) => void;
  dismissAnnouncement: (index: number) => void;
  clearAnnouncements: () => void;
  isGoalLocked: boolean;
  currentGoal: string | null;
  setGoal: (goal: string) => void;
  telepathicMode: boolean;
  toggleTelepathicMode: () => void;
}

const TelepathicContext = createContext<TelepathicContextType | undefined>(undefined);

export function useTelepathicContext() {
  const context = useContext(TelepathicContext);
  if (context === undefined) {
    throw new Error('useTelepathicContext must be used within a TelepathicContextProvider');
  }
  return context;
}

interface TelepathicContextProviderProps {
  children: ReactNode;
}

export function TelepathicContextProvider({ children }: TelepathicContextProviderProps) {
  const [announcements, setAnnouncements] = useState<TelepathicAnnouncementBanner[]>([]);
  const [telepathicMode, setTelepathicMode] = useState(true);
  const { caseMemory, updateCaseGoal } = useEnhancedMemory();
  const { toast } = useToast();

  // Goal management with telepathic continuity
  const isGoalLocked = Boolean(caseMemory?.primary_goal && caseMemory?.goal_status === 'active');
  const currentGoal = caseMemory?.primary_goal || null;

  const setGoal = async (goal: string) => {
    if (!isGoalLocked) {
      await updateCaseGoal(goal);
      toast({
        title: "🎯 Goal Locked",
        description: `Your goal has been set: ${goal}. I'll build on this in every response.`,
      });
    }
  };

  const addAnnouncement = (announcement: Omit<TelepathicAnnouncementBanner, 'timestamp'>) => {
    setAnnouncements(prev => [
      ...prev,
      { ...announcement, timestamp: new Date() }
    ]);

    // Auto-dismiss after 30 seconds unless it's an action item
    if (!announcement.action) {
      setTimeout(() => {
        setAnnouncements(prev => prev.filter((_, i) => i !== prev.length - 1));
      }, 30000);
    }
  };

  const dismissAnnouncement = (index: number) => {
    setAnnouncements(prev => prev.filter((_, i) => i !== index));
  };

  const clearAnnouncements = () => {
    setAnnouncements([]);
  };

  const toggleTelepathicMode = () => {
    setTelepathicMode(prev => !prev);
    toast({
      title: telepathicMode ? "🔮 Telepathic Mode Disabled" : "🧠 Telepathic Mode Enabled",
      description: telepathicMode 
        ? "Switching to standard response mode" 
        : "Enhanced memory and proactive features activated",
    });
  };

  // Parse announcements from AI responses
  useEffect(() => {
    // This will be called by the ChatInterface when processing AI responses
    // to extract and display telepathic announcements
  }, []);

  const contextValue: TelepathicContextType = {
    announcements,
    addAnnouncement,
    dismissAnnouncement,
    clearAnnouncements,
    isGoalLocked,
    currentGoal,
    setGoal,
    telepathicMode,
    toggleTelepathicMode,
  };

  return (
    <TelepathicContext.Provider value={contextValue}>
      {children}
    </TelepathicContext.Provider>
  );
}