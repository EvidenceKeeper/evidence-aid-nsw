import { supabase } from "@/integrations/supabase/client";

interface DeepDiveAnalysis {
  timelineSpine: string[];
  behaviorPatterns: string[];
  possibleBreaches: string[];
  risks: string[];
  gapsAndFixes: string[];
  nextStep: string;
}

export async function generateDeepDiveAnalysis(userId: string): Promise<DeepDiveAnalysis | null> {
  try {
    // Get timeline events
    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("event_date, title, category")
      .eq("user_id", userId)
      .order("event_date", { ascending: true })
      .limit(6);

    // Get comprehensive analysis
    const { data: analysis } = await supabase
      .from("evidence_comprehensive_analysis")
      .select("pattern_connections, key_insights, strategic_recommendations, evidence_gaps_identified, case_impact")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    // Get legal strategy
    const { data: strategy } = await supabase
      .from("legal_strategy")
      .select("case_strength_overall, strengths, weaknesses, evidence_gaps, next_steps")
      .eq("user_id", userId)
      .single();

    if (!timeline && !analysis && !strategy) return null;

    // Build timeline spine (≤6 lines)
    const timelineSpine = timeline?.slice(0, 6).map(event => 
      `${event.event_date}: ${event.title}`
    ) || ["No timeline events recorded"];

    // Extract behavior patterns (≤4 lines)
    const patterns = analysis?.flatMap(a => 
      Array.isArray(a.pattern_connections) ? a.pattern_connections.slice(0, 2) : []
    ) || [];
    const behaviorPatterns = patterns.slice(0, 4).map((p: any) => 
      typeof p === 'string' ? p : `Pattern: ${p?.type || 'Behavioral'} - ${p?.description || 'Repeated incidents'}`
    );
    if (behaviorPatterns.length === 0) behaviorPatterns.push("No clear patterns identified yet");

    // Possible breaches (≤3 lines)
    const strengths = Array.isArray(strategy?.strengths) ? strategy.strengths : [];
    const insights = analysis?.flatMap(a => Array.isArray(a.key_insights) ? a.key_insights : []) || [];
    const possibleBreaches: string[] = [
      ...strengths.filter((s: any) => typeof s === 'string' && s.toLowerCase().includes('breach')).slice(0, 2),
      ...insights.filter((i: any) => typeof i === 'string' && (i.toLowerCase().includes('violation') || i.toLowerCase().includes('breach'))).slice(0, 1)
    ].slice(0, 3).filter((item): item is string => typeof item === 'string');
    if (possibleBreaches.length === 0) possibleBreaches.push("Potential legal breaches being assessed");

    // Risks (≤3 lines)
    const weaknesses = Array.isArray(strategy?.weaknesses) ? strategy.weaknesses : [];
    const risks = weaknesses.slice(0, 3).map((w: any) => typeof w === 'string' ? w : `Risk: ${w?.description || 'Evidence quality concerns'}`);
    if (risks.length === 0) risks.push("Risk assessment in progress");

    // Gaps & fixes (≤3 lines)
    const evidenceGaps = Array.isArray(strategy?.evidence_gaps) ? strategy.evidence_gaps : [];
    const analysisGaps = analysis?.flatMap(a => Array.isArray(a.evidence_gaps_identified) ? a.evidence_gaps_identified : []) || [];
    const gapsAndFixes = [
      ...evidenceGaps.slice(0, 2).map((gap: any) => `Gap: ${typeof gap === 'string' ? gap : gap?.description || 'Missing evidence'}`),
      ...analysisGaps.slice(0, 1).map((gap: any) => `Fix: ${gap}`)
    ].slice(0, 3);
    if (gapsAndFixes.length === 0) gapsAndFixes.push("Evidence gaps being identified");

    // Next actionable step
    const nextSteps = Array.isArray(strategy?.next_steps) ? strategy.next_steps : [];
    const recommendations = analysis?.flatMap(a => Array.isArray(a.strategic_recommendations) ? a.strategic_recommendations : []) || [];
    const nextStep = nextSteps[0] || recommendations[0] || "Continue gathering evidence and documentation";

    return {
      timelineSpine,
      behaviorPatterns,
      possibleBreaches,
      risks,
      gapsAndFixes,
      nextStep: typeof nextStep === 'string' ? nextStep : `${(nextStep as any)?.action || 'Next step'}: ${(nextStep as any)?.description || 'Review and strengthen case foundation'}`
    };
  } catch (error) {
    console.error("Deep dive analysis failed:", error);
    return null;
  }
}