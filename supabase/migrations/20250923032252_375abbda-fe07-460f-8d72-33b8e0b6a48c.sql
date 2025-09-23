-- Create legal-training storage bucket for admin uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-training', 
  'legal-training', 
  false, 
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'text/plain']
);

-- Create storage policies for legal-training bucket
CREATE POLICY "Admins can upload legal training documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'legal-training' AND 
  (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can view legal training documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'legal-training' AND 
  (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins can delete legal training documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'legal-training' AND 
  (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'))
);

-- Create legal document processing queue table
CREATE TABLE public.legal_document_processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  bucket_id TEXT NOT NULL DEFAULT 'legal-training',
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  processing_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on processing queue
ALTER TABLE public.legal_document_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for processing queue
CREATE POLICY "Admins can manage processing queue" 
ON public.legal_document_processing_queue 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage processing queue" 
ON public.legal_document_processing_queue 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create function to handle new file uploads
CREATE OR REPLACE FUNCTION public.handle_legal_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process files in legal-training bucket
  IF NEW.bucket_id = 'legal-training' THEN
    INSERT INTO public.legal_document_processing_queue (
      file_path,
      file_name,
      bucket_id,
      status,
      processing_metadata
    ) VALUES (
      NEW.name,
      split_part(NEW.name, '/', -1),
      NEW.bucket_id,
      'pending',
      jsonb_build_object(
        'file_size', NEW.metadata->>'size',
        'content_type', NEW.metadata->>'mimetype',
        'uploaded_at', NEW.created_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic processing queue insertion
CREATE TRIGGER legal_document_upload_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_legal_document_upload();

-- Add index for processing queue performance
CREATE INDEX idx_legal_processing_queue_status ON public.legal_document_processing_queue(status);
CREATE INDEX idx_legal_processing_queue_created_at ON public.legal_document_processing_queue(created_at);