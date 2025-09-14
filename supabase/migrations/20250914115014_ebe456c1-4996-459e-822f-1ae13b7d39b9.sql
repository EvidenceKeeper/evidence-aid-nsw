-- Fix security warnings: Set search_path for functions

-- Recreate the TSV update function with proper security settings
CREATE OR REPLACE FUNCTION public.update_legal_sections_tsv()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    coalesce(NEW.title, '') || ' ' || 
    coalesce(NEW.content, '') || ' ' || 
    coalesce(NEW.citation_reference, '') || ' ' ||
    coalesce(array_to_string(NEW.legal_concepts, ' '), '')
  );
  RETURN NEW;
END;
$$;

-- Recreate the update timestamp function with proper security settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;