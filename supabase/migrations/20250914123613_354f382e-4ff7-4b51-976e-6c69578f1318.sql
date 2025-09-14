-- Enhance legal sections with better citation tracking
ALTER TABLE public.legal_sections 
ADD COLUMN source_url TEXT,
ADD COLUMN paragraph_anchor TEXT,
ADD COLUMN citation_format TEXT, -- e.g., "s 60CC Family Law Act 1975 (Cth)"
ADD COLUMN last_verified DATE DEFAULT CURRENT_DATE;

-- Create legal citations table for structured citation management
CREATE TABLE public.legal_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.legal_sections(id) ON DELETE CASCADE NOT NULL,
    citation_type TEXT NOT NULL CHECK (citation_type IN ('statute', 'case_law', 'regulation', 'practice_direction', 'rule')),
    short_citation TEXT NOT NULL, -- e.g., "s 60CC(2)(a)"
    full_citation TEXT NOT NULL, -- e.g., "Section 60CC(2)(a) of the Family Law Act 1975 (Cth)"
    neutral_citation TEXT, -- e.g., "[2023] FamCAFC 123"
    court TEXT, -- e.g., "Federal Circuit and Family Court of Australia"
    year INTEGER,
    jurisdiction TEXT NOT NULL DEFAULT 'NSW',
    url TEXT,
    confidence_score REAL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on legal_citations
ALTER TABLE public.legal_citations ENABLE ROW LEVEL SECURITY;

-- RLS policies for legal_citations
CREATE POLICY "Legal citations are publicly viewable"
ON public.legal_citations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only service role can modify legal citations"
ON public.legal_citations
FOR ALL
TO authenticated
USING (auth.role() = 'service_role');

-- Create index for faster citation lookups
CREATE INDEX idx_legal_citations_type_jurisdiction ON public.legal_citations(citation_type, jurisdiction);
CREATE INDEX idx_legal_citations_year ON public.legal_citations(year);

-- Add trigger for updated_at on legal_citations
CREATE TRIGGER update_legal_citations_updated_at
BEFORE UPDATE ON public.legal_citations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();