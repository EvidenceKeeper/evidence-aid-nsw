DELETE FROM public.milestone_progress a
USING public.milestone_progress b
WHERE a.case_plan_id = b.case_plan_id
  AND a.milestone_index = b.milestone_index
  AND a.updated_at < b.updated_at;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'milestone_progress_plan_index_key'
  ) THEN
    ALTER TABLE public.milestone_progress
      ADD CONSTRAINT milestone_progress_plan_index_key UNIQUE (case_plan_id, milestone_index);
  END IF;
END $$;