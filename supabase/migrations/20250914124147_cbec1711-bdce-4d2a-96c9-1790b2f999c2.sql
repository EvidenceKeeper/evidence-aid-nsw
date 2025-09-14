-- Create evidence analysis table to track AI insights on user evidence
CREATE TABLE public.evidence_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('legal_relevance', 'timeline_extraction', 'pattern_detection', 'case_strength')),
    content TEXT NOT NULL,
    legal_concepts JSONB DEFAULT '[]'::jsonb,
    confidence_score REAL DEFAULT 0.0,
    relevant_citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidence_analysis ENABLE ROW LEVEL SECURITY;

-- Create evidence-legal connections table
CREATE TABLE public.evidence_legal_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    evidence_file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    legal_section_id UUID REFERENCES public.legal_sections(id) ON DELETE CASCADE NOT NULL,
    connection_type TEXT NOT NULL CHECK (connection_type IN ('supports', 'contradicts', 'explains', 'precedent', 'requirement')),
    relevance_score REAL DEFAULT 0.0,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidence_legal_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for evidence_analysis
CREATE POLICY "Users can view their evidence analysis"
ON public.evidence_analysis
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their evidence analysis"
ON public.evidence_analysis
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their evidence analysis"
ON public.evidence_analysis
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their evidence analysis"
ON public.evidence_analysis
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS policies for evidence_legal_connections
CREATE POLICY "Users can view their evidence connections"
ON public.evidence_legal_connections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their evidence connections"
ON public.evidence_legal_connections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their evidence connections"
ON public.evidence_legal_connections
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their evidence connections"
ON public.evidence_legal_connections
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_evidence_analysis_user_file ON public.evidence_analysis(user_id, file_id);
CREATE INDEX idx_evidence_analysis_type ON public.evidence_analysis(analysis_type);
CREATE INDEX idx_evidence_connections_user ON public.evidence_legal_connections(user_id);
CREATE INDEX idx_evidence_connections_relevance ON public.evidence_legal_connections(relevance_score DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_evidence_analysis_updated_at
BEFORE UPDATE ON public.evidence_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get evidence-informed legal advice
CREATE OR REPLACE FUNCTION public.get_evidence_informed_advice(
    _user_id UUID,
    _query TEXT,
    _include_evidence BOOLEAN DEFAULT false
)
RETURNS TABLE(
    legal_content TEXT,
    evidence_relevance REAL,
    file_name TEXT,
    connection_explanation TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ls.content as legal_content,
        COALESCE(elc.relevance_score, 0.0) as evidence_relevance,
        f.name as file_name,
        elc.explanation as connection_explanation
    FROM legal_sections ls
    LEFT JOIN legal_documents ld ON ls.document_id = ld.id
    LEFT JOIN evidence_legal_connections elc ON ls.id = elc.legal_section_id AND elc.user_id = _user_id
    LEFT JOIN files f ON elc.evidence_file_id = f.id
    WHERE 
        (NOT _include_evidence OR elc.id IS NOT NULL)
        AND (ld.scope = 'global' OR (ld.scope = 'personal' AND ld.user_id = _user_id))
        AND ls.tsv @@ websearch_to_tsquery('english', _query)
    ORDER BY 
        CASE WHEN _include_evidence THEN elc.relevance_score ELSE ts_rank(ls.tsv, websearch_to_tsquery('english', _query)) END DESC
    LIMIT 20;
$$;