import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CaseMemory {
  id: string;
  user_id: string;
  primary_goal?: string | null;
  goal_status?: string | null;
  key_facts?: any;
  timeline_summary?: any;
  evidence_index?: any;
  thread_summary?: string | null;
  case_strength_score?: number | null;
  case_strength_reasons?: any;
  last_updated_at?: string | null;
}

interface MemorySettings {
  proactiveTriggersActive: boolean;
  caseStrengthMonitoring: boolean;
  communicationStyle: 'gentle' | 'direct' | 'collaborative';
  pacePreference: 'slow' | 'moderate' | 'fast';
}

interface ProactiveContext {
  timeline_context: string;
  person_appearances: string;
  case_strength_change: string;
  evidence_announcement: string;
}

interface CaseSnapshot {
  goalSummary: string;
  keyStrengths: string[];
  progressMade: string[];
  currentFocus: string;
  lastUpdated: Date;
}

export function useOptimizedMemory() {
  const [caseMemory, setCaseMemory] = useState<CaseMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<MemorySettings>({
    proactiveTriggersActive: true,
    caseStrengthMonitoring: true,
    communicationStyle: 'collaborative',
    pacePreference: 'moderate'
  });
  const [rememberedTopics] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('optimized-memory-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error("Failed to load memory settings:", error);
      }
    }
  }, []);

  // Load case memory
  const loadCaseMemory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("case_memory")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to load case memory:", error);
      } else if (data) {
        setCaseMemory(data);
      }
    } catch (error) {
      console.error("Error loading case memory:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaseMemory();
  }, [loadCaseMemory]);

  // Memoized computed values
  const isGoalLocked = useMemo(() => 
    Boolean(caseMemory?.primary_goal && caseMemory?.goal_status === 'active'),
    [caseMemory?.primary_goal, caseMemory?.goal_status]
  );

  const currentGoal = useMemo(() => 
    caseMemory?.primary_goal || null,
    [caseMemory?.primary_goal]
  );

  const caseStrength = useMemo(() => ({
    score: Math.round(caseMemory?.case_strength_score || 0),
    reasons: caseMemory?.case_strength_reasons || [],
  }), [caseMemory?.case_strength_score, caseMemory?.case_strength_reasons]);

  const caseSnapshot = useMemo((): CaseSnapshot | null => {
    if (!caseMemory) return null;

    return {
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
  }, [caseMemory]);

  // Optimized proactive memory triggers
  const runProactiveMemoryTriggers = useCallback(async (
    queryText: string,
    contextBlocks: string[]
  ): Promise<ProactiveContext | null> => {
    if (!settings.proactiveTriggersActive) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke("memory-manager", {
        body: {
          user_id: user.id,
          query_text: queryText,
          action_type: "proactive_triggers",
          data: { context_blocks: contextBlocks },
        },
      });

      if (error) {
        console.error("Proactive triggers failed:", error);
        return null;
      }

      return data?.proactive_context || null;
    } catch (error) {
      console.error("Error running proactive triggers:", error);
      return null;
    }
  }, [settings.proactiveTriggersActive]);

  // Update settings with persistence
  const updateSettings = useCallback((newSettings: Partial<MemorySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('optimized-memory-settings', JSON.stringify(updated));
      return updated;
    });

    toast({
      title: "Memory Settings Updated",
      description: "Your preferences have been saved.",
    });
  }, [toast]);

  // Update case goal
  const updateCaseGoal = useCallback(async (goal: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("case_memory")
        .upsert({
          user_id: user.id,
          primary_goal: goal,
          goal_established_at: new Date().toISOString(),
          goal_status: "active",
          last_updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to update case goal:", error);
        toast({
          title: "Error",
          description: "Failed to update case goal",
          variant: "destructive",
        });
      } else {
        toast({
          title: "🎯 Goal Locked",
          description: `Your goal has been set: ${goal}. I'll build on this in every response.`,
        });
        await loadCaseMemory();
      }
    } catch (error) {
      console.error("Error updating case goal:", error);
    }
  }, [toast, loadCaseMemory]);

  // Add key fact
  const addKeyFact = useCallback(async (fact: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !caseMemory) return;

      const currentFacts = caseMemory.key_facts || [];
      const updatedFacts = [...currentFacts, {
        fact,
        added_at: new Date().toISOString(),
        id: crypto.randomUUID(),
      }];

      const { error } = await supabase
        .from("case_memory")
        .update({
          key_facts: updatedFacts,
          last_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to add key fact:", error);
      } else {
        await loadCaseMemory();
      }
    } catch (error) {
      console.error("Error adding key fact:", error);
    }
  }, [caseMemory, loadCaseMemory]);

  // Context-aware suggestions
  const getContextualSuggestions = useCallback((userInput?: string): string[] => {
    const suggestions: string[] = [];

    if (caseMemory?.primary_goal) {
      suggestions.push(
        `How does my latest evidence support my goal to ${caseMemory.primary_goal}?`
      );
    }

    if (caseMemory?.evidence_index?.length > 0) {
      suggestions.push("What patterns do you see across all my evidence?");
    }

    if (caseMemory?.case_strength_score && caseMemory.case_strength_score < 70) {
      suggestions.push("What specific actions would boost my case strength the most?");
    }

    // Context-aware based on user input
    if (userInput) {
      const input = userInput.toLowerCase();
      if (input.includes('evidence')) {
        suggestions.unshift("Consider uploading more supporting documents");
      }
      if (input.includes('timeline')) {
        suggestions.unshift("A detailed timeline could strengthen your case");
      }
    }

    return suggestions.slice(0, 3);
  }, [caseMemory]);

  // Memory-aware features toggle
  const announceMemoryUpdate = useCallback((message: string) => {
    toast({
      title: "🧠 Memory Update",
      description: message,
      duration: 4000,
    });
  }, [toast]);

  // Check if topic was already discussed
  const avoidRepeatingQuestions = useCallback((topic: string): boolean => {
    const topicKey = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
    return rememberedTopics.has(topicKey);
  }, [rememberedTopics]);

  return {
    // Core memory data
    caseMemory,
    loading,
    isGoalLocked,
    currentGoal,
    caseStrength,
    caseSnapshot,
    
    // Settings
    settings,
    updateSettings,
    
    // Actions
    loadCaseMemory,
    updateCaseGoal,
    addKeyFact,
    runProactiveMemoryTriggers,
    getContextualSuggestions,
    announceMemoryUpdate,
    avoidRepeatingQuestions,
    
    // Computed helpers
    getEvidenceIndex: () => caseMemory?.evidence_index || [],
    getTimelineEvents: () => caseMemory?.timeline_summary || [],
    getStrengthsBasedSummary: () => {
      if (!caseMemory) return "You're taking important steps by being here.";
      const evidenceCount = caseMemory.evidence_index?.length || 0;
      const timelineEvents = caseMemory.timeline_summary?.length || 0;
      return `You've shown incredible strength: ${evidenceCount} pieces of evidence organized, ${timelineEvents} timeline events documented. Your case strength has grown to ${caseStrength.score}/10. You're making real progress.`;
    }
  };
}