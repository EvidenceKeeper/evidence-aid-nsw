-- Create messages table for persistent conversation history
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON public.messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own messages
CREATE POLICY "Users can insert their own messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can select their own messages
CREATE POLICY "Users can select their own messages"
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can manage all messages
CREATE POLICY "Service role can manage all messages"
ON public.messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);