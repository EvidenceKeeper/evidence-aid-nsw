import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CaseSnapshot {
  caseStrength: number;
  keyInsights: string[];
  timelineEvents: number;
  evidenceFiles: number;
  lastUpdated: Date;
}

export function useCaseSnapshot() {
  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;

      const userId = sessionData.session.user.id;

      // Get case strength and insights
      const { data: strategyData } = await supabase
        .from("legal_strategy")
        .select("case_strength_overall, strengths, next_steps")
        .eq("user_id", userId)
        .maybeSingle();

      // Get timeline events count
      const { count: timelineCount } = await supabase
        .from("timeline_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get evidence files count
      const { count: filesCount } = await supabase
        .from("files")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get latest analysis insights
      const { data: analysisData } = await supabase
        .from("evidence_comprehensive_analysis")
        .select("key_insights, strategic_recommendations")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      const allInsights = analysisData?.flatMap(a => [
        ...(a.key_insights || []),
        ...(a.strategic_recommendations || [])
      ]) || [];

      const keyInsights = [
        ...(Array.isArray(strategyData?.strengths) ? strategyData.strengths.slice(0, 2) : []),
        ...allInsights.slice(0, 3)
      ].slice(0, 4).filter((insight): insight is string => typeof insight === 'string');

      const newSnapshot: CaseSnapshot = {
        caseStrength: strategyData?.case_strength_overall || 0,
        keyInsights,
        timelineEvents: timelineCount || 0,
        evidenceFiles: filesCount || 0,
        lastUpdated: new Date()
      };

      setSnapshot(newSnapshot);
      return newSnapshot;
    } catch (error) {
      console.error("Failed to refresh case snapshot:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { snapshot, loading, refreshSnapshot };
}