import { useState, useEffect } from "react";
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

interface ProactiveContext {
  timeline_context: string;
  person_appearances: string;
  case_strength_change: string;
  evidence_announcement: string;
}

export function useEnhancedMemory() {
  const [caseMemory, setCaseMemory] = useState<CaseMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCaseMemory();
  }, []);

  const loadCaseMemory = async () => {
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
  };

  const runProactiveMemoryTriggers = async (
    queryText: string,
    contextBlocks: string[]
  ): Promise<ProactiveContext | null> => {
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
  };

  const updateThreadSummary = async (queryText: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("memory-manager", {
        body: {
          user_id: user.id,
          query_text: queryText,
          action_type: "update_thread_summary",
        },
      });

      if (error) {
        console.error("Thread summary update failed:", error);
      } else {
        // Reload case memory to get updated summary
        await loadCaseMemory();
      }
    } catch (error) {
      console.error("Error updating thread summary:", error);
    }
  };

  const updateCaseGoal = async (goal: string) => {
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
          title: "Goal Updated",
          description: `Your case goal has been set: ${goal}`,
        });
        await loadCaseMemory();
      }
    } catch (error) {
      console.error("Error updating case goal:", error);
    }
  };

  const addKeyFact = async (fact: string) => {
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
  };

  const getEvidenceIndex = () => {
    return caseMemory?.evidence_index || [];
  };

  const getCaseStrength = () => {
    return {
      score: Math.round(caseMemory?.case_strength_score || 0),
      reasons: caseMemory?.case_strength_reasons || [],
    };
  };

  const getTimelineEvents = () => {
    return caseMemory?.timeline_summary || [];
  };

  return {
    caseMemory,
    loading,
    loadCaseMemory,
    runProactiveMemoryTriggers,
    updateThreadSummary,
    updateCaseGoal,
    addKeyFact,
    getEvidenceIndex,
    getCaseStrength,
    getTimelineEvents,
  };
}