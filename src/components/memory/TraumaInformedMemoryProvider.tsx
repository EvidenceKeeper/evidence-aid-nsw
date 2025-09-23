import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useEnhancedMemory } from '@/hooks/useEnhancedMemory';
import { useToast } from '@/hooks/use-toast';

interface SafetyPreferences {
  communicationStyle: 'gentle' | 'direct' | 'collaborative';
  pacePreference: 'slow' | 'moderate' | 'fast';
  triggerWords: string[];
  supportiveLanguage: boolean;
  reminderFrequency: 'minimal' | 'moderate' | 'frequent';
}

interface CaseSnapshot {
  goalSummary: string;
  keyStrengths: string[];
  progressMade: string[];
  currentFocus: string;
  lastUpdated: Date;
}

interface TraumaInformedMemoryContextType {
  safetyPreferences: SafetyPreferences | null;
  caseSnapshot: CaseSnapshot | null;
  updateSafetyPreferences: (preferences: Partial<SafetyPreferences>) => void;
  generateCaseSnapshot: () => CaseSnapshot | null;
  rememberContext: (context: string, emotional_tone?: string) => void;
  avoidRepeatingQuestions: (topic: string) => boolean;
  getStrengthsBasedSummary: () => string;
}

const TraumaInformedMemoryContext = createContext<TraumaInformedMemoryContextType | undefined>(undefined);

export function useTraumaInformedMemory() {
  const context = useContext(TraumaInformedMemoryContext);
  if (context === undefined) {
    throw new Error('useTraumaInformedMemory must be used within a TraumaInformedMemoryProvider');
  }
  return context;
}

interface TraumaInformedMemoryProviderProps {
  children: ReactNode;
}

export function TraumaInformedMemoryProvider({ children }: TraumaInformedMemoryProviderProps) {
  const [safetyPreferences, setSafetyPreferences] = useState<SafetyPreferences | null>(null);
  const [caseSnapshot, setCaseSnapshot] = useState<CaseSnapshot | null>(null);
  const [rememberedTopics, setRememberedTopics] = useState<Set<string>>(new Set());
  
  const { caseMemory, updateCaseGoal, getCaseStrength } = useEnhancedMemory();
  const { toast } = useToast();

  // Initialize safety preferences with trauma-informed defaults
  useEffect(() => {
    const defaultPreferences: SafetyPreferences = {
      communicationStyle: 'collaborative',
      pacePreference: 'moderate',
      triggerWords: [],
      supportiveLanguage: true,
      reminderFrequency: 'moderate'
    };
    setSafetyPreferences(defaultPreferences);
  }, []);

  // Generate case snapshot to prevent re-traumatization
  const generateCaseSnapshot = (): CaseSnapshot | null => {
    if (!caseMemory) return null;

    const snapshot: CaseSnapshot = {
      goalSummary: caseMemory.primary_goal || "Building your case step by step",
      keyStrengths: [
        "You've taken the brave step to seek help",
        "You're gathering evidence systematically",
        "You're building knowledge about your rights"
      ],
      progressMade: [
        caseMemory.evidence_index?.length > 0 ? `${caseMemory.evidence_index.length} pieces of evidence organized` : null,
        caseMemory.timeline_summary?.length > 0 ? "Timeline events documented" : null,
        caseMemory.key_facts?.length > 0 ? `${caseMemory.key_facts.length} key facts identified` : null
      ].filter(Boolean) as string[],
      currentFocus: "Gathering and organizing evidence",
      lastUpdated: new Date()
    };

    setCaseSnapshot(snapshot);
    return snapshot;
  };

  const updateSafetyPreferences = (preferences: Partial<SafetyPreferences>) => {
    setSafetyPreferences(prev => prev ? { ...prev, ...preferences } : null);
    
    toast({
      title: "🛡️ Safety Preferences Updated",
      description: "I'll adjust my communication style to better support you.",
    });
  };

  const rememberContext = (context: string, emotional_tone?: string) => {
    // Store context to prevent re-asking
    const contextKey = context.toLowerCase().replace(/[^a-z0-9]/g, '');
    setRememberedTopics(prev => new Set([...prev, contextKey]));
    
    // Store emotional context if provided for sensitive responses
    if (emotional_tone) {
      localStorage.setItem(`emotion_context_${contextKey}`, emotional_tone);
    }
  };

  const avoidRepeatingQuestions = (topic: string): boolean => {
    const topicKey = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
    return rememberedTopics.has(topicKey);
  };

  const getStrengthsBasedSummary = (): string => {
    if (!caseMemory) return "You're taking important steps by being here.";

    const caseStrength = getCaseStrength();
    const evidenceCount = caseMemory.evidence_index?.length || 0;
    const timelineEvents = caseMemory.timeline_summary?.length || 0;

    return `You've shown incredible strength: ${evidenceCount} pieces of evidence organized, ${timelineEvents} timeline events documented. Your case strength has grown to ${caseStrength.score}/10. You're making real progress.`;
  };

  // Auto-generate case snapshot when memory updates
  useEffect(() => {
    if (caseMemory) {
      generateCaseSnapshot();
    }
  }, [caseMemory]);

  const contextValue: TraumaInformedMemoryContextType = {
    safetyPreferences,
    caseSnapshot,
    updateSafetyPreferences,
    generateCaseSnapshot,
    rememberContext,
    avoidRepeatingQuestions,
    getStrengthsBasedSummary,
  };

  return (
    <TraumaInformedMemoryContext.Provider value={contextValue}>
      {children}
    </TraumaInformedMemoryContext.Provider>
  );
}