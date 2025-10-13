-- Add confidence and transparency fields to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS confidence_score real CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS reasoning text,
ADD COLUMN IF NOT EXISTS verification_status text CHECK (verification_status IN ('ai_generated', 'requires_review', 'lawyer_verified')),
ADD COLUMN IF NOT EXISTS source_references jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_legal_advice boolean DEFAULT false;

-- Add index for filtering by verification status
CREATE INDEX IF NOT EXISTS idx_messages_verification_status ON public.messages(verification_status);

-- Add comment for documentation
COMMENT ON COLUMN public.messages.confidence_score IS 'AI confidence score between 0-1 based on source quality and legal complexity';
COMMENT ON COLUMN public.messages.reasoning IS 'Explanation of why this suggestion was made, for transparency';
COMMENT ON COLUMN public.messages.verification_status IS 'Whether this response is AI-generated, needs review, or verified by a lawyer';
COMMENT ON COLUMN public.messages.source_references IS 'Array of legal sources used: [{type: "statute", citation: "...", url: "..."}]';
COMMENT ON COLUMN public.messages.is_legal_advice IS 'Whether this message contains legal advice (requires stronger disclaimers)';