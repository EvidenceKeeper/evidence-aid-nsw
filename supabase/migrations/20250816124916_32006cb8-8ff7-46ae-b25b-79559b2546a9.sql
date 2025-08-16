-- Create timeline_events table for extracted dates and events
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES public.chunks(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  context TEXT, -- surrounding text from document
  confidence REAL DEFAULT 0.5, -- AI confidence in extraction
  verified BOOLEAN DEFAULT false, -- user verified
  category TEXT, -- incident, communication, legal_action, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for timeline queries
CREATE INDEX idx_timeline_events_user_date ON public.timeline_events(user_id, event_date DESC);
CREATE INDEX idx_timeline_events_file ON public.timeline_events(file_id);

-- Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their timeline events" 
ON public.timeline_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert timeline events" 
ON public.timeline_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their timeline events" 
ON public.timeline_events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their timeline events" 
ON public.timeline_events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_timeline_events_updated_at
BEFORE UPDATE ON public.timeline_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add category and tags to files table for better organization
ALTER TABLE public.files 
ADD COLUMN category TEXT,
ADD COLUMN tags TEXT[],
ADD COLUMN auto_category TEXT; -- AI-suggested category

-- Create index for file search
CREATE INDEX idx_files_category ON public.files(category);
CREATE INDEX idx_files_tags ON public.files USING GIN(tags);

-- Add full-text search to chunks
ALTER TABLE public.chunks ADD COLUMN IF NOT EXISTS tsv tsvector;

-- Create function to update tsvector
CREATE OR REPLACE FUNCTION public.update_chunks_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv := to_tsvector('english', NEW.text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tsvector updates
CREATE TRIGGER update_chunks_tsv_trigger
BEFORE INSERT OR UPDATE ON public.chunks
FOR EACH ROW
EXECUTE FUNCTION public.update_chunks_tsv();

-- Update existing chunks with tsvector
UPDATE public.chunks SET tsv = to_tsvector('english', text) WHERE tsv IS NULL;

-- Create index for full-text search
CREATE INDEX idx_chunks_tsv ON public.chunks USING GIN(tsv);