-- Fix the remaining function search path issue
CREATE OR REPLACE FUNCTION public.nsw_legal_resources_tsv_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    coalesce(NEW.title, '') || ' ' || 
    coalesce(NEW.content, '') || ' ' || 
    coalesce(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$;

-- Now populate with sample legal sections from NSW Crimes Act
INSERT INTO public.legal_documents (title, document_type, jurisdiction, source_url) VALUES
('Crimes Act 1900 (NSW)', 'act', 'NSW', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1900-040'),
('Crimes (Domestic and Personal Violence) Act 2007 (NSW)', 'act', 'NSW', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2007-080'),
('Family Law Act 1975 (Commonwealth)', 'act', 'Commonwealth', 'https://www.legislation.gov.au/Details/C2022C00361')
ON CONFLICT DO NOTHING;

-- Add sample legal concepts
INSERT INTO public.legal_concepts (concept_name, description) VALUES
('coercive control', 'Pattern of controlling or coercive behaviour in intimate relationships'),
('domestic violence', 'Violence between family members or intimate partners'),
('family law', 'Legal matters relating to family relationships, children, and property'),
('criminal law', 'Laws defining crimes and punishments'),
('evidence law', 'Rules governing the admission and evaluation of evidence in legal proceedings'),
('police powers', 'Authority and procedures for law enforcement'),
('child protection', 'Legal framework for protecting children from harm'),
('property settlement', 'Division of assets in family law matters')
ON CONFLICT DO NOTHING;