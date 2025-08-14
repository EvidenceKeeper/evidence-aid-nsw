
-- 1) Populate chunks.tsv automatically

CREATE OR REPLACE FUNCTION public.chunks_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tsv := to_tsvector('english', coalesce(NEW.text, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chunks_tsv_update ON public.chunks;
CREATE TRIGGER trg_chunks_tsv_update
BEFORE INSERT OR UPDATE OF text ON public.chunks
FOR EACH ROW EXECUTE FUNCTION public.chunks_tsv_update();

-- Backfill existing rows
UPDATE public.chunks
SET tsv = to_tsvector('english', coalesce(text, ''))
WHERE tsv IS NULL;

-- Index for fast full-text search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'chunks_tsv_idx' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX chunks_tsv_idx ON public.chunks USING GIN (tsv);
  END IF;
END;
$$;

-- 2) Ensure messages.citations is never NULL on insert

CREATE OR REPLACE FUNCTION public.messages_citations_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.citations IS NULL THEN
    NEW.citations := '[]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_citations_default ON public.messages;
CREATE TRIGGER trg_messages_citations_default
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_citations_default();
