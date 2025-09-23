-- Add stage tracking and user journey enhancement columns to case_memory
ALTER TABLE case_memory 
ADD COLUMN IF NOT EXISTS current_stage INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS user_journey_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS personalization_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_activity_type TEXT,
ADD COLUMN IF NOT EXISTS feedback_scores JSONB DEFAULT '[]'::jsonb;

-- Create user sessions tracking table for adaptive personalization
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  stage_progression JSONB DEFAULT '[]'::jsonb,
  interaction_quality REAL DEFAULT 0.5,
  feedback_given JSONB DEFAULT '[]'::jsonb,
  completion_status TEXT DEFAULT 'ongoing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user sessions
CREATE POLICY "Users can view their own sessions" 
ON user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to check if match_evidence_chunks exists and create if missing
CREATE OR REPLACE FUNCTION create_match_evidence_chunks_if_missing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'match_evidence_chunks'
  ) THEN
    -- Create the function if it doesn't exist
    EXECUTE 'CREATE OR REPLACE FUNCTION match_evidence_chunks(
      query_embedding vector, 
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
    SET search_path TO ''public''
    AS $func$
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
        AND f.status = ''processed''
      ORDER BY c.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $func$';
  END IF;
END;
$$;

-- Execute the function to create match_evidence_chunks if missing
SELECT create_match_evidence_chunks_if_missing();

-- Drop the helper function
DROP FUNCTION create_match_evidence_chunks_if_missing();