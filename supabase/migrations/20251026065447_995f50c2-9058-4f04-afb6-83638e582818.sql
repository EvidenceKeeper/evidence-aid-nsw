-- Create case_plans table
CREATE TABLE IF NOT EXISTS public.case_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal TEXT NOT NULL,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_milestone_index INTEGER NOT NULL DEFAULT 0,
  overall_progress_percentage INTEGER NOT NULL DEFAULT 0,
  urgency_level TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create milestone_progress table
CREATE TABLE IF NOT EXISTS public.milestone_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_plan_id UUID NOT NULL REFERENCES public.case_plans(id) ON DELETE CASCADE,
  milestone_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  evidence_collected JSONB DEFAULT '[]'::jsonb,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'complete'))
);

-- Add active_case_plan_id to case_memory
ALTER TABLE public.case_memory 
ADD COLUMN IF NOT EXISTS active_case_plan_id UUID REFERENCES public.case_plans(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_case_plans_user_id ON public.case_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_case_plan_id ON public.milestone_progress(case_plan_id);
CREATE INDEX IF NOT EXISTS idx_case_memory_case_plan_id ON public.case_memory(active_case_plan_id);

-- Enable RLS
ALTER TABLE public.case_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_plans
CREATE POLICY "Users can view their own case plans"
  ON public.case_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own case plans"
  ON public.case_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own case plans"
  ON public.case_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own case plans"
  ON public.case_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for milestone_progress
CREATE POLICY "Users can view their milestone progress"
  ON public.milestone_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.case_plans
    WHERE case_plans.id = milestone_progress.case_plan_id
    AND case_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their milestone progress"
  ON public.milestone_progress FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.case_plans
    WHERE case_plans.id = milestone_progress.case_plan_id
    AND case_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their milestone progress"
  ON public.milestone_progress FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.case_plans
    WHERE case_plans.id = milestone_progress.case_plan_id
    AND case_plans.user_id = auth.uid()
  ));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_case_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_plans_updated_at
  BEFORE UPDATE ON public.case_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_case_plan_updated_at();

CREATE TRIGGER milestone_progress_updated_at
  BEFORE UPDATE ON public.milestone_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_case_plan_updated_at();