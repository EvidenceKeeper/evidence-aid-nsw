-- Core schema for AI Lawyer Workspace - Phase 2 (ingestion v1 + retrieval-ready)

-- Create files table to track user uploads and processing state
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  size BIGINT,
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded | processing | processed | failed
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunks table stores retrieval units for RAG
CREATE TABLE IF NOT EXISTS public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  text TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Full-text search column (generated)
  tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(text, ''))
  ) STORED
);

-- Messages table to store chat history and citations
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id UUID,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case memory per user (facts/parties/issues)
CREATE TABLE IF NOT EXISTS public.case_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  facts TEXT,
  parties JSONB,
  issues JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Common updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_files_updated_at'
  ) THEN
    CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_case_memory_updated_at'
  ) THEN
    CREATE TRIGGER update_case_memory_updated_at
    BEFORE UPDATE ON public.case_memory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_files_user_created_at ON public.files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_file_seq ON public.chunks(file_id, seq);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON public.chunks USING GIN (tsv);
CREATE INDEX IF NOT EXISTS idx_messages_user_created_at ON public.messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_memory ENABLE ROW LEVEL SECURITY;

-- Files policies (owner-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can select their files'
  ) THEN
    CREATE POLICY "Users can select their files"
    ON public.files FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can insert their files'
  ) THEN
    CREATE POLICY "Users can insert their files"
    ON public.files FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can update their files'
  ) THEN
    CREATE POLICY "Users can update their files"
    ON public.files FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can delete their files'
  ) THEN
    CREATE POLICY "Users can delete their files"
    ON public.files FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Chunks policies (based on ownership of parent file)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can select their chunks'
  ) THEN
    CREATE POLICY "Users can select their chunks"
    ON public.chunks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.id = file_id AND f.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can insert their chunks'
  ) THEN
    CREATE POLICY "Users can insert their chunks"
    ON public.chunks FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.id = file_id AND f.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can update their chunks'
  ) THEN
    CREATE POLICY "Users can update their chunks"
    ON public.chunks FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.id = file_id AND f.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can delete their chunks'
  ) THEN
    CREATE POLICY "Users can delete their chunks"
    ON public.chunks FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.id = file_id AND f.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Messages policies (owner-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can select their messages'
  ) THEN
    CREATE POLICY "Users can select their messages"
    ON public.messages FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can insert their messages'
  ) THEN
    CREATE POLICY "Users can insert their messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can delete their messages'
  ) THEN
    CREATE POLICY "Users can delete their messages"
    ON public.messages FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Case memory policies (owner-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can view their case memory'
  ) THEN
    CREATE POLICY "Users can view their case memory"
    ON public.case_memory FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can insert their case memory'
  ) THEN
    CREATE POLICY "Users can insert their case memory"
    ON public.case_memory FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can update their case memory'
  ) THEN
    CREATE POLICY "Users can update their case memory"
    ON public.case_memory FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;