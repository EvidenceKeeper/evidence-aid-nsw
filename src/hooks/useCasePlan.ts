import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Milestone {
  title: string;
  description: string;
  success_criteria: string[];
  estimated_days: number;
  priority: string;
  category: string;
}

interface MilestoneProgress {
  id: string;
  milestone_index: number;
  status: 'not_started' | 'in_progress' | 'complete';
  completion_percentage: number;
  evidence_collected: any[];
  completed_at: string | null;
  notes: string | null;
}

interface CasePlan {
  id: string;
  user_id: string;
  primary_goal: string;
  milestones: Milestone[];
  current_milestone_index: number;
  overall_progress_percentage: number;
  urgency_level: string;
  created_at: string;
  updated_at: string;
}

export function useCasePlan() {
  const [casePlan, setCasePlan] = useState<CasePlan | null>(null);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCasePlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get active case plan ID from case_memory
      const { data: memory } = await supabase
        .from('case_memory')
        .select('active_case_plan_id')
        .eq('user_id', user.id)
        .single();

      if (!memory?.active_case_plan_id) {
        setLoading(false);
        return;
      }

      // Load case plan
      const { data: plan, error: planError } = await supabase
        .from('case_plans')
        .select('*')
        .eq('id', memory.active_case_plan_id)
        .single();

      if (planError) throw planError;

      setCasePlan(plan as any);
      
      if (plan) {
        const milestones = (plan.milestones || []) as unknown as Milestone[];
        setCurrentMilestone(milestones[plan.current_milestone_index]);

        // Load milestone progress
        const { data: progress, error: progressError } = await supabase
          .from('milestone_progress')
          .select('*')
          .eq('case_plan_id', plan.id)
          .order('milestone_index');

        if (progressError) throw progressError;
        setMilestoneProgress((progress || []) as any);
      }
    } catch (error: any) {
      console.error('Error loading case plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMilestoneProgress = async (conversationSummary?: string, newEvidenceIds?: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-milestone-progress', {
        body: {
          conversation_summary: conversationSummary,
          new_evidence_ids: newEvidenceIds
        }
      });

      if (error) throw error;

      // Reload case plan to get updated data
      await loadCasePlan();

      // Show celebration if milestone completed
      if (data.milestone_status === 'complete') {
        toast({
          title: '🎉 Milestone Complete!',
          description: data.advanced_to_next_milestone 
            ? `Moving to: ${data.next_milestone?.title}`
            : 'Great progress on your case!',
          duration: 5000
        });
      }

      return data;
    } catch (error: any) {
      console.error('Error updating milestone progress:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  useEffect(() => {
    loadCasePlan();

    // Subscribe to case plan changes
    const subscription = supabase
      .channel('case_plan_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'case_plans'
      }, () => {
        loadCasePlan();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'milestone_progress'
      }, () => {
        loadCasePlan();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    casePlan,
    currentMilestone,
    milestoneProgress,
    loading,
    updateMilestoneProgress,
    reload: loadCasePlan
  };
}