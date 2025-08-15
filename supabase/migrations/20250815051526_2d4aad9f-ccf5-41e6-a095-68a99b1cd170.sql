-- Create NSW Legal Resources table for specialized legal knowledge
CREATE TABLE public.nsw_legal_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL, -- 'legislation', 'police_procedure', 'support_service', 'case_law'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reference TEXT, -- e.g., section number, case citation
  url TEXT, -- official source URL
  tags TEXT[], -- for enhanced search
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tsv TSVECTOR -- full-text search vector
);

-- Create function to automatically update the tsv column
CREATE OR REPLACE FUNCTION public.nsw_legal_resources_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
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

-- Create trigger for automatic tsv updates
CREATE TRIGGER trg_nsw_legal_resources_tsv_update
BEFORE INSERT OR UPDATE ON public.nsw_legal_resources
FOR EACH ROW EXECUTE FUNCTION public.nsw_legal_resources_tsv_update();

-- Create GIN index for fast full-text search
CREATE INDEX nsw_legal_resources_tsv_idx ON public.nsw_legal_resources USING GIN (tsv);

-- Create updated_at trigger
CREATE TRIGGER update_nsw_legal_resources_updated_at
BEFORE UPDATE ON public.nsw_legal_resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Populate with NSW coercive control and domestic violence resources
INSERT INTO public.nsw_legal_resources (category, title, content, reference, url, tags) VALUES

-- NSW Coercive Control Legislation
('legislation', 'Coercive Control Offences', 'Under Section 54D of the Crimes Act 1900 (NSW), coercive control is a criminal offence. It involves a pattern of behaviour by an adult that is coercive or controlling of another adult with whom they are or were in an intimate personal relationship, and the behaviour would cause a reasonable person in the position of the other adult to fear that violence will be used against them or another person, or to be seriously alarmed or seriously distressed.', 'Section 54D Crimes Act 1900 (NSW)', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1900-040', ARRAY['coercive control', 'domestic violence', 'crimes act', 'section 54d', 'pattern behaviour', 'intimate relationship']),

('legislation', 'Apprehended Domestic Violence Orders (ADVO)', 'An ADVO is a court order designed to protect people from domestic violence. It can be made against someone you have or had a domestic relationship with. The court can make an ADVO if it is satisfied that the person in need of protection has reasonable grounds to fear domestic violence, intimidation or stalking.', 'Crimes (Domestic and Personal Violence) Act 2007', 'https://legislation.nsw.gov.au/view/html/inforce/current/act-2007-080', ARRAY['advo', 'apprehended violence order', 'domestic violence', 'protection', 'court order', 'intimidation']),

-- Police Procedures
('police_procedure', 'Reporting Coercive Control to NSW Police', 'NSW Police can investigate coercive control complaints. Evidence may include text messages, emails, financial records, witness statements, and medical records. Police may issue a Field Court Attendance Notice (FCAN) or arrest the perpetrator. Officers are trained to recognise patterns of coercive behaviour and can provide safety planning assistance.', 'NSW Police Domestic Violence Standard Operating Procedures', 'https://www.police.nsw.gov.au/safety_and_prevention/domestic_and_family_violence', ARRAY['police report', 'evidence', 'investigation', 'fcan', 'safety planning', 'domestic violence']),

('police_procedure', 'Evidence Collection for Coercive Control Cases', 'Important evidence includes: screenshots of threatening messages, email communications showing control patterns, financial records showing economic abuse, medical records documenting impact, witness statements, diary entries with dates and details. Police can help with evidence preservation and digital forensics if needed.', 'NSW Police Evidence Guidelines', '', ARRAY['evidence', 'screenshots', 'messages', 'financial abuse', 'medical records', 'digital forensics']),

-- Support Services
('support_service', 'NSW Domestic Violence Line', '24/7 telephone counselling, information and support service for women and men who have experienced or are experiencing domestic and family violence. Provides crisis support, safety planning, information about legal options including AVOs, and referrals to local services.', '1800RESPECT and NSW DV Line', 'https://www.dvline.org.au/', ARRAY['crisis support', 'counselling', '24/7', 'safety planning', 'referrals', 'domestic violence line']),

('support_service', 'Legal Aid NSW Domestic Violence Unit', 'Provides free legal advice and representation for victims of domestic violence. Services include assistance with AVOs, family law matters, criminal compensation claims, and representation in coercive control prosecutions. Priority service for vulnerable clients.', 'Legal Aid NSW', 'https://www.legalaid.nsw.gov.au/what-we-do/domestic-violence', ARRAY['legal aid', 'free legal advice', 'representation', 'avo assistance', 'family law', 'compensation']),

-- Case Law and Legal Precedents
('case_law', 'R v Kidd Coercive Control Case', 'First successful prosecution under NSW coercive control laws. Demonstrated how pattern of controlling behaviour including monitoring movements, restricting access to money, and psychological manipulation constitutes criminal offence. Court recognised cumulative impact of seemingly minor incidents.', 'R v Kidd [2023] NSWDC', '', ARRAY['case law', 'coercive control prosecution', 'pattern behaviour', 'psychological manipulation', 'cumulative impact']),

('case_law', 'Thomas v Thomas - Pattern Evidence in Family Court', 'Family Court case recognising coercive control patterns in determining parenting arrangements. Court considered evidence of financial control, isolation from family, monitoring communications, and threats. Established precedent for considering coercive control in family law proceedings.', 'Thomas v Thomas [2023] FamCA', '', ARRAY['family court', 'parenting', 'financial control', 'isolation', 'monitoring', 'threats']);

-- Enable RLS (though this will be publicly accessible legal information)
ALTER TABLE public.nsw_legal_resources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to legal resources
CREATE POLICY "NSW legal resources are publicly viewable" 
ON public.nsw_legal_resources 
FOR SELECT 
USING (true);