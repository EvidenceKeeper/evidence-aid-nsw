import React, { createContext, useContext, ReactNode } from 'react';
import { useOptimizedMemory } from '@/hooks/useOptimizedMemory';

interface UnifiedMemoryContextType {
  // Re-export all optimized memory features
  caseMemory: ReturnType<typeof useOptimizedMemory>['caseMemory'];
  loading: boolean;
  isGoalLocked: boolean;
  currentGoal: string | null;
  caseStrength: { score: number; reasons: any[] };
  caseSnapshot: ReturnType<typeof useOptimizedMemory>['caseSnapshot'];
  settings: ReturnType<typeof useOptimizedMemory>['settings'];
  
  // Actions
  updateSettings: ReturnType<typeof useOptimizedMemory>['updateSettings'];
  updateCaseGoal: ReturnType<typeof useOptimizedMemory>['updateCaseGoal'];
  addKeyFact: ReturnType<typeof useOptimizedMemory>['addKeyFact'];
  runProactiveMemoryTriggers: ReturnType<typeof useOptimizedMemory>['runProactiveMemoryTriggers'];
  getContextualSuggestions: ReturnType<typeof useOptimizedMemory>['getContextualSuggestions'];
  announceMemoryUpdate: ReturnType<typeof useOptimizedMemory>['announceMemoryUpdate'];
  avoidRepeatingQuestions: ReturnType<typeof useOptimizedMemory>['avoidRepeatingQuestions'];
  
  // Computed helpers
  getEvidenceIndex: ReturnType<typeof useOptimizedMemory>['getEvidenceIndex'];
  getTimelineEvents: ReturnType<typeof useOptimizedMemory>['getTimelineEvents'];
  getStrengthsBasedSummary: ReturnType<typeof useOptimizedMemory>['getStrengthsBasedSummary'];
  
  // Legacy compatibility for telepathic mode
  telepathicMode: boolean;
  toggleTelepathicMode: () => void;
  addAnnouncement: (announcement: { type: string; title: string; content: string; action?: string }) => void;
  announcements: any[];
  dismissAnnouncement: (index: number) => void;
  clearAnnouncements: () => void;
  setGoal: (goal: string) => void;
}

const UnifiedMemoryContext = createContext<UnifiedMemoryContextType | undefined>(undefined);

export function useUnifiedMemory() {
  const context = useContext(UnifiedMemoryContext);
  if (context === undefined) {
    throw new Error('useUnifiedMemory must be used within a UnifiedMemoryProvider');
  }
  return context;
}

interface UnifiedMemoryProviderProps {
  children: ReactNode;
}

export function UnifiedMemoryProvider({ children }: UnifiedMemoryProviderProps) {
  const memory = useOptimizedMemory();
  const [announcements, setAnnouncements] = React.useState<any[]>([]);

  // Legacy telepathic mode - now just maps to proactive triggers
  const telepathicMode = memory.settings.proactiveTriggersActive;
  
  const toggleTelepathicMode = () => {
    memory.updateSettings({ 
      proactiveTriggersActive: !memory.settings.proactiveTriggersActive 
    });
  };

  const addAnnouncement = (announcement: { type: string; title: string; content: string; action?: string }) => {
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

  const contextValue: UnifiedMemoryContextType = {
    // Core memory data
    ...memory,
    
    // Legacy telepathic compatibility
    telepathicMode,
    toggleTelepathicMode,
    addAnnouncement,
    announcements,
    dismissAnnouncement,
    clearAnnouncements,
    setGoal: memory.updateCaseGoal,
  };

  return (
    <UnifiedMemoryContext.Provider value={contextValue}>
      {children}
    </UnifiedMemoryContext.Provider>
  );
}

// Legacy export aliases for backward compatibility
export const useTelepathicContext = useUnifiedMemory;
export const useEnhancedMemoryContext = useUnifiedMemory;
export const useTraumaInformedMemory = useUnifiedMemory;
export const useAnticipatorContext = useUnifiedMemory;