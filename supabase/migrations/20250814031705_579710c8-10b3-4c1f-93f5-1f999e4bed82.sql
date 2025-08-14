-- Create trigger function to automatically populate tsv column for full-text search
CREATE OR REPLACE FUNCTION public.update_chunks_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv := to_tsvector('english', NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tsv on insert/update
DROP TRIGGER IF EXISTS chunks_tsv_update ON public.chunks;
CREATE TRIGGER chunks_tsv_update
  BEFORE INSERT OR UPDATE ON public.chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chunks_tsv();

-- Create GIN index on tsv column for fast full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON public.chunks USING GIN(tsv);

-- Backfill existing rows that have empty tsv
UPDATE public.chunks 
SET tsv = to_tsvector('english', text) 
WHERE tsv IS NULL;

-- Create trigger function to ensure citations is never null
CREATE OR REPLACE FUNCTION public.ensure_citations_not_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.citations IS NULL THEN
    NEW.citations := '[]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set default citations on insert
DROP TRIGGER IF EXISTS messages_citations_default ON public.messages;
CREATE TRIGGER messages_citations_default
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_citations_not_null();