-- Create enhanced NSW legal corpus schema for RAG system
-- Legal chunks table with pgvector for embeddings
CREATE TABLE public.legal_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  section_id UUID REFERENCES legal_sections(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_order INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  provenance JSONB NOT NULL DEFAULT '{}', -- URL, publisher, court, date, version hash
  paragraph_anchor TEXT,
  legal_concepts TEXT[],
  citation_references TEXT[],
  confidence_score REAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for legal chunks
ALTER TABLE public.legal_chunks ENABLE ROW LEVEL SECURITY;

-- Create policies for legal chunks
CREATE POLICY "Legal chunks viewable based on document access"
ON public.legal_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM legal_documents ld 
    WHERE ld.id = legal_chunks.document_id 
    AND (ld.scope = 'global' OR ld.user_id = auth.uid())
  )
);

CREATE POLICY "Privileged users can modify legal chunks"
ON public.legal_chunks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM legal_documents ld 
    WHERE ld.id = legal_chunks.document_id 
    AND (
      ld.user_id = auth.uid() 
      OR has_role(auth.uid(), 'admin'::app_role) 
      OR (ld.scope = 'global' AND has_role(auth.uid(), 'lawyer'::app_role))
    )
  )
);

-- NSW court entities and relationships
CREATE TABLE public.nsw_courts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_name TEXT NOT NULL UNIQUE,
  court_level TEXT NOT NULL, -- 'federal', 'supreme', 'district', 'local', 'specialist'
  jurisdiction TEXT NOT NULL DEFAULT 'NSW',
  location TEXT,
  contact_info JSONB DEFAULT '{}',
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert core NSW courts
INSERT INTO public.nsw_courts (court_name, court_level, location, website_url) VALUES
('Federal Circuit and Family Court of Australia', 'federal', 'Multiple locations', 'https://www.fcfcoa.gov.au/'),
('Supreme Court of New South Wales', 'supreme', 'Sydney', 'https://www.supremecourt.nsw.gov.au/'),
('District Court of New South Wales', 'district', 'Multiple locations', 'https://www.districtcourt.nsw.gov.au/'),
('Local Court of New South Wales', 'local', 'Multiple locations', 'https://www.localcourt.nsw.gov.au/'),
('NSW Civil and Administrative Tribunal', 'specialist', 'Multiple locations', 'https://www.ncat.nsw.gov.au/');

-- Legal evaluation dataset for quality checks
CREATE TABLE public.legal_evaluation_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'NSW',
  topic TEXT NOT NULL, -- 'family_law', 'domestic_violence', 'avo', 'parenting_orders'
  expected_answer TEXT NOT NULL,
  required_citations TEXT[], -- Array of expected citation patterns
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate', -- 'basic', 'intermediate', 'advanced'
  reviewer_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for evaluation questions
ALTER TABLE public.legal_evaluation_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for evaluation questions
CREATE POLICY "Lawyers and admins can view evaluation questions"
ON public.legal_evaluation_questions
FOR SELECT
USING (has_role(auth.uid(), 'lawyer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage evaluation questions"
ON public.legal_evaluation_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RAG response quality tracking
CREATE TABLE public.rag_response_quality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  response_content TEXT NOT NULL,
  citations_provided JSONB DEFAULT '[]',
  citation_hit_rate REAL, -- Percentage of legal claims with citations
  source_freshness REAL, -- Average age of cited sources in days
  confidence_score REAL,
  user_feedback INTEGER, -- 1-5 rating if provided
  evaluation_question_id UUID REFERENCES legal_evaluation_questions(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for RAG quality tracking
ALTER TABLE public.rag_response_quality ENABLE ROW LEVEL SECURITY;

-- Create policies for RAG quality tracking
CREATE POLICY "Users can view their RAG quality records"
ON public.rag_response_quality
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert RAG quality records"
ON public.rag_response_quality
FOR INSERT
WITH CHECK (true); -- Allow service role to insert

-- Enhanced legal document metadata
ALTER TABLE public.legal_documents 
ADD COLUMN IF NOT EXISTS source_authority TEXT,
ADD COLUMN IF NOT EXISTS last_verified DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS checksum TEXT,
ADD COLUMN IF NOT EXISTS ingestion_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Enhanced legal sections with anchoring
ALTER TABLE public.legal_sections
ADD COLUMN IF NOT EXISTS source_checksum TEXT,
ADD COLUMN IF NOT EXISTS context_before TEXT,
ADD COLUMN IF NOT EXISTS context_after TEXT;

-- Function to match legal chunks with similarity search
CREATE OR REPLACE FUNCTION match_legal_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  jurisdiction_filter text DEFAULT NULL,
  court_filter text DEFAULT NULL,
  year_from int DEFAULT NULL,
  year_to int DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  section_id uuid,
  chunk_text text,
  similarity float,
  metadata jsonb,
  provenance jsonb,
  citation_references text[],
  legal_concepts text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lc.id,
    lc.document_id,
    lc.section_id,
    lc.chunk_text,
    (1 - (lc.embedding <=> query_embedding)) as similarity,
    lc.metadata,
    lc.provenance,
    lc.citation_references,
    lc.legal_concepts
  FROM legal_chunks lc
  INNER JOIN legal_documents ld ON lc.document_id = ld.id
  WHERE 
    lc.embedding <=> query_embedding < (1 - match_threshold)
    AND ld.status = 'active'
    AND (jurisdiction_filter IS NULL OR ld.jurisdiction = jurisdiction_filter)
    AND (court_filter IS NULL OR (lc.metadata->>'court')::text ILIKE '%' || court_filter || '%')
    AND (year_from IS NULL OR (lc.metadata->>'year')::int >= year_from)
    AND (year_to IS NULL OR (lc.metadata->>'year')::int <= year_to)
  ORDER BY lc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding ON legal_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_document_id ON legal_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_metadata ON legal_chunks USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_concepts ON legal_chunks USING GIN(legal_concepts);

-- Add triggers for updated_at
CREATE TRIGGER update_legal_chunks_updated_at
BEFORE UPDATE ON public.legal_chunks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_evaluation_questions_updated_at
BEFORE UPDATE ON public.legal_evaluation_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample evaluation questions for NSW law
INSERT INTO public.legal_evaluation_questions (question_text, topic, expected_answer, required_citations, difficulty_level) VALUES
('What are the grounds for obtaining an AVO in NSW and what happens at the first mention?', 'avo', 'An AVO can be sought on grounds including intimidation, harassment, or stalking under the Crimes (Domestic and Personal Violence) Act 2007 (NSW). At first mention, the court may make an interim order if satisfied there are reasonable grounds.', ARRAY['Crimes (Domestic and Personal Violence) Act 2007', 's 16', 's 25'], 'basic'),
('What factors must the court consider when making parenting orders under the Family Law Act?', 'family_law', 'The paramount consideration is the best interests of the child as set out in s 60CA of the Family Law Act 1975 (Cth), including primary and additional considerations in s 60CC.', ARRAY['Family Law Act 1975', 's 60CA', 's 60CC'], 'intermediate'),
('How does coercive control differ from physical domestic violence in NSW law?', 'domestic_violence', 'Coercive control is a pattern of behaviour that controls, coerces, or causes fear, now criminalized under s 54D of the Crimes Act 1900 (NSW), distinct from physical violence offences.', ARRAY['Crimes Act 1900', 's 54D'], 'intermediate');