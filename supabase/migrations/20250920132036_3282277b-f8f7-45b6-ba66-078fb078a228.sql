-- Enhanced Memory & Recall: Phase 1 - Database Schema Updates

-- Add embedding field to chunks table for vector search
ALTER TABLE public.chunks 
ADD COLUMN embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON public.chunks 
USING hnsw (embedding vector_cosine_ops);

-- Add hierarchical summary fields to files table
ALTER TABLE public.files 
ADD COLUMN file_summary text,
ADD COLUMN section_summaries jsonb DEFAULT '[]'::jsonb,
ADD COLUMN exhibit_code text;

-- Enhance case_memory table with structured memory fields
ALTER TABLE public.case_memory 
ADD COLUMN key_facts jsonb DEFAULT '[]'::jsonb,
ADD COLUMN timeline_summary jsonb DEFAULT '[]'::jsonb,
ADD COLUMN evidence_index jsonb DEFAULT '[]'::jsonb,
ADD COLUMN thread_summary text,
ADD COLUMN case_strength_score real DEFAULT 0.0,
ADD COLUMN case_strength_reasons jsonb DEFAULT '[]'::jsonb,
ADD COLUMN last_updated_at timestamp with time zone DEFAULT now();

-- Create function to match user chunks with vector similarity
CREATE OR REPLACE FUNCTION public.match_user_chunks(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  file_id uuid,
  seq integer,
  text text,
  similarity double precision,
  meta jsonb,
  file_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.file_id,
    c.seq,
    c.text,
    (1 - (c.embedding <=> query_embedding)) as similarity,
    c.meta,
    f.name as file_name
  FROM chunks c
  INNER JOIN files f ON c.file_id = f.id
  WHERE 
    c.embedding <=> query_embedding < (1 - match_threshold)
    AND (filter_user_id IS NULL OR f.user_id = filter_user_id)
    AND f.status = 'processed'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger to update case_memory last_updated_at
CREATE OR REPLACE FUNCTION public.update_case_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_case_memory_updated_at
  BEFORE UPDATE ON public.case_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_case_memory_timestamp();