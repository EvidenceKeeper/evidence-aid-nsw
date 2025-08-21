-- Create evidence relationships table to track connections between evidence pieces
CREATE TABLE public.evidence_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_file_id UUID NOT NULL,
  target_file_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'supports', 'contradicts', 'chronological', 'pattern'
  confidence REAL NOT NULL DEFAULT 0.5,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case analysis history to track evolution of case understanding
CREATE TABLE public.case_analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL, -- 'evidence_added', 'pattern_identified', 'strength_updated'
  trigger_file_id UUID, -- The file that triggered this analysis
  previous_state JSONB,
  new_state JSONB,
  key_insights TEXT[],
  case_strength_change REAL, -- How much the case strength changed (-1.0 to 1.0)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pattern recognition cache for identified patterns
CREATE TABLE public.case_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'escalation', 'financial_control', 'isolation', 'communication'
  evidence_files UUID[], -- Array of file IDs that support this pattern
  pattern_strength REAL NOT NULL DEFAULT 0.5,
  description TEXT NOT NULL,
  legal_significance TEXT,
  timeline_start DATE,
  timeline_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal strategy state to track current case assessment
CREATE TABLE public.legal_strategy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_strength_overall REAL NOT NULL DEFAULT 0.0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  opposing_arguments JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_elements_status JSONB NOT NULL DEFAULT '{}'::jsonb, -- Track Section 54D elements etc
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evidence processing queue for automatic analysis
CREATE TABLE public.evidence_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_type TEXT NOT NULL DEFAULT 'full_analysis',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS on all new tables
ALTER TABLE public.evidence_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for evidence_relationships
CREATE POLICY "Users can view their evidence relationships" 
ON public.evidence_relationships FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their evidence relationships" 
ON public.evidence_relationships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their evidence relationships" 
ON public.evidence_relationships FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their evidence relationships" 
ON public.evidence_relationships FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for case_analysis_history
CREATE POLICY "Users can view their case analysis history" 
ON public.case_analysis_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their case analysis history" 
ON public.case_analysis_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for case_patterns
CREATE POLICY "Users can view their case patterns" 
ON public.case_patterns FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their case patterns" 
ON public.case_patterns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their case patterns" 
ON public.case_patterns FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their case patterns" 
ON public.case_patterns FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for legal_strategy
CREATE POLICY "Users can view their legal strategy" 
ON public.legal_strategy FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their legal strategy" 
ON public.legal_strategy FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their legal strategy" 
ON public.legal_strategy FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their legal strategy" 
ON public.legal_strategy FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for evidence_processing_queue
CREATE POLICY "Users can view their processing queue" 
ON public.evidence_processing_queue FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their processing queue" 
ON public.evidence_processing_queue FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their processing queue" 
ON public.evidence_processing_queue FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_evidence_relationships_user_id ON public.evidence_relationships(user_id);
CREATE INDEX idx_evidence_relationships_source_file ON public.evidence_relationships(source_file_id);
CREATE INDEX idx_case_analysis_history_user_id ON public.case_analysis_history(user_id);
CREATE INDEX idx_case_patterns_user_id ON public.case_patterns(user_id);
CREATE INDEX idx_legal_strategy_user_id ON public.legal_strategy(user_id);
CREATE INDEX idx_evidence_processing_queue_user_status ON public.evidence_processing_queue(user_id, status);

-- Create trigger for updating timestamps
CREATE TRIGGER update_evidence_relationships_updated_at
  BEFORE UPDATE ON public.evidence_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_patterns_updated_at
  BEFORE UPDATE ON public.case_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_strategy_updated_at
  BEFORE UPDATE ON public.legal_strategy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();