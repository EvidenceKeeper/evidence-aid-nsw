-- Add goal tracking fields to case_memory table
ALTER TABLE public.case_memory 
ADD COLUMN primary_goal TEXT,
ADD COLUMN goal_established_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN goal_status TEXT DEFAULT 'active' CHECK (goal_status IN ('active', 'achieved', 'changed', 'unclear'));