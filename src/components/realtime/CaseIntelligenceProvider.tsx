import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CaseIntelligence {
  caseStrength: number;
  insights: string[];
  patterns: Array<{
    type: string;
    description: string;
    strength: number;
    legal_significance: string;
  }>;
  nextSteps: string[];
  isAnalyzing: boolean;
}

const CaseIntelligenceContext = createContext<{
  intelligence: CaseIntelligence;
  triggerAnalysis: () => Promise<void>;
}>({
  intelligence: {
    caseStrength: 0,
    insights: [],
    patterns: [],
    nextSteps: [],
    isAnalyzing: false,
  },
  triggerAnalysis: async () => {},
});

export const useCaseIntelligence = () => useContext(CaseIntelligenceContext);

export function CaseIntelligenceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<CaseIntelligence>({
    caseStrength: 0,
    insights: [],
    patterns: [],
    nextSteps: [],
    isAnalyzing: false,
  });

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCaseIntelligence = async () => {
    if (!user) return;

    try {
      // Get current legal strategy
      const { data: strategy } = await supabase
        .from('legal_strategy')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get current patterns
      const { data: patterns } = await supabase
        .from('case_patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('pattern_strength', { ascending: false });

      // Get recent insights from analysis history
      const { data: recentAnalysis } = await supabase
        .from('case_analysis_history')
        .select('key_insights')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const allInsights = recentAnalysis?.flatMap(a => a.key_insights || []) || [];

      setIntelligence({
        caseStrength: strategy?.case_strength_overall || 0,
        insights: allInsights.slice(0, 3), // Show top 3 recent insights
        patterns: (patterns || []).map(p => ({
          type: p.pattern_type,
          description: p.description,
          strength: p.pattern_strength,
          legal_significance: p.legal_significance || ''
        })),
        nextSteps: Array.isArray(strategy?.next_steps) 
          ? (strategy.next_steps as string[]).filter(step => typeof step === 'string')
          : [],
        isAnalyzing: false,
      });

    } catch (error) {
      console.error('Error loading case intelligence:', error);
    }
  };

  const triggerAnalysis = async () => {
    if (!user) return;

    setIntelligence(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const response = await supabase.functions.invoke('continuous-case-analysis', {
        body: { analysis_type: 'full_case_review' }
      });

      if (response.error) {
        throw response.error;
      }

      // Reload intelligence after analysis
      await loadCaseIntelligence();

    } catch (error) {
      console.error('Error triggering analysis:', error);
    } finally {
      setIntelligence(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  useEffect(() => {
    loadCaseIntelligence();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('case-intelligence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'legal_strategy',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCaseIntelligence();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_patterns',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCaseIntelligence();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <CaseIntelligenceContext.Provider value={{ intelligence, triggerAnalysis }}>
      {children}
    </CaseIntelligenceContext.Provider>
  );
}