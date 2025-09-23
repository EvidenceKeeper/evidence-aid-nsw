-- Add case_readiness_status to case_memory table for answer gating
ALTER TABLE public.case_memory 
ADD COLUMN case_readiness_status TEXT DEFAULT 'collecting' CHECK (case_readiness_status IN ('collecting', 'reviewing', 'nearly_ready', 'ready'));

-- Add index for faster queries
CREATE INDEX idx_case_memory_readiness_status ON public.case_memory(case_readiness_status);

-- Add comment for documentation
COMMENT ON COLUMN public.case_memory.case_readiness_status IS 'Controls when AI can provide drafting actions: collecting/reviewing/nearly_ready/ready';