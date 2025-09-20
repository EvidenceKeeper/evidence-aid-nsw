import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTelepathicContext } from './TelepathicContextProvider';
import { useEnhancedMemory } from '@/hooks/useEnhancedMemory';

interface AnticipatedContext {
  relevantLegalConcepts: string[];
  suggestedQuestions: string[];
  contextualHints: string[];
  nextLikelyActions: string[];
  conversationMomentum: 'building' | 'exploring' | 'deciding' | 'stuck';
}

interface AnticipatorContextType {
  anticipatedContext: AnticipatedContext | null;
  updateContext: (newContext: Partial<AnticipatedContext>) => void;
  getContextualSuggestions: (userInput: string) => string[];
}

const AnticipatorContext = createContext<AnticipatorContextType | undefined>(undefined);

export function useAnticipatorContext() {
  const context = useContext(AnticipatorContext);
  if (context === undefined) {
    throw new Error('useAnticipatorContext must be used within an AnticipatorContextProvider');
  }
  return context;
}

interface AnticipatorContextProviderProps {
  children: ReactNode;
}

export function AnticipatorContextProvider({ children }: AnticipatorContextProviderProps) {
  const [anticipatedContext, setAnticipatedContext] = useState<AnticipatedContext | null>(null);
  const { telepathicMode, currentGoal } = useTelepathicContext();
  const { caseMemory } = useEnhancedMemory();

  useEffect(() => {
    if (telepathicMode && currentGoal) {
      generateAnticipatedContext();
    }
  }, [telepathicMode, currentGoal, caseMemory]);

  const generateAnticipatedContext = () => {
    if (!currentGoal || !caseMemory) return;

    const context: AnticipatedContext = {
      relevantLegalConcepts: generateRelevantConcepts(),
      suggestedQuestions: generateSuggestedQuestions(),
      contextualHints: generateContextualHints(),
      nextLikelyActions: generateNextActions(),
      conversationMomentum: detectConversationMomentum()
    };

    setAnticipatedContext(context);
  };

  const generateRelevantConcepts = (): string[] => {
    const concepts: string[] = [];
    
    if (currentGoal?.toLowerCase().includes('custody')) {
      concepts.push('Best interests of the child', 'Parental fitness', 'Stability factors');
    }
    
    if (currentGoal?.toLowerCase().includes('divorce')) {
      concepts.push('Property division', 'Spousal support', 'Custody arrangements');
    }
    
    if (currentGoal?.toLowerCase().includes('employment')) {
      concepts.push('Wrongful termination', 'Workplace discrimination', 'Employment contracts');
    }

    return concepts.slice(0, 3);
  };

  const generateSuggestedQuestions = (): string[] => {
    const questions: string[] = [];
    
    if (caseMemory?.case_strength_score && caseMemory.case_strength_score < 0.6) {
      questions.push('What evidence would strengthen my case?');
      questions.push('What are the weakest points in my argument?');
    }
    
    if (caseMemory?.timeline_summary) {
      questions.push('Are there any timeline gaps I should address?');
      questions.push('How does this timeline support my goal?');
    }

    questions.push('What should I expect in my next legal step?');
    
    return questions.slice(0, 3);
  };

  const generateContextualHints = (): string[] => {
    const hints: string[] = [];
    
    if (caseMemory?.evidence_index && Object.keys(caseMemory.evidence_index).length < 3) {
      hints.push('Consider uploading more supporting documents');
    }
    
    if (!caseMemory?.timeline_summary || caseMemory.timeline_summary.length < 100) {
      hints.push('A detailed timeline could strengthen your case');
    }
    
    hints.push('I can help analyze patterns in your evidence');
    
    return hints.slice(0, 2);
  };

  const generateNextActions = (): string[] => {
    const actions: string[] = [];
    
    if (currentGoal) {
      actions.push('Review case strategy');
      actions.push('Identify evidence gaps');
      actions.push('Prepare next steps');
    }
    
    return actions;
  };

  const detectConversationMomentum = (): AnticipatedContext['conversationMomentum'] => {
    // Simple heuristic based on case strength and evidence completeness
    if (!caseMemory?.case_strength_score) return 'building';
    
    if (caseMemory.case_strength_score > 0.8) return 'deciding';
    if (caseMemory.case_strength_score > 0.5) return 'exploring';
    if (caseMemory.case_strength_score < 0.3) return 'stuck';
    
    return 'building';
  };

  const updateContext = (newContext: Partial<AnticipatedContext>) => {
    setAnticipatedContext(prev => prev ? { ...prev, ...newContext } : null);
  };

  const getContextualSuggestions = (userInput: string): string[] => {
    if (!anticipatedContext) return [];
    
    // Analyze user input and return contextual suggestions
    const input = userInput.toLowerCase();
    const suggestions: string[] = [];
    
    if (input.includes('evidence') && anticipatedContext.contextualHints.length > 0) {
      suggestions.push(...anticipatedContext.contextualHints);
    }
    
    if (input.includes('what') || input.includes('how')) {
      suggestions.push(...anticipatedContext.suggestedQuestions);
    }
    
    return suggestions.slice(0, 2);
  };

  const contextValue: AnticipatorContextType = {
    anticipatedContext,
    updateContext,
    getContextualSuggestions,
  };

  return (
    <AnticipatorContext.Provider value={contextValue}>
      {children}
    </AnticipatorContext.Provider>
  );
}