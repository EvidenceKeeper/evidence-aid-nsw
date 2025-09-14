-- Enhanced NSW Legal Entity-Relationship Model
-- This creates a structured legal knowledge graph

-- Legal Acts and Legislation
CREATE TABLE public.legal_acts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  act_name TEXT NOT NULL,
  act_number TEXT,
  year INTEGER NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'NSW',
  status TEXT NOT NULL DEFAULT 'current', -- current, repealed, amended
  commencement_date DATE,
  repeal_date DATE,
  parent_act_id UUID REFERENCES legal_acts(id),
  act_type TEXT NOT NULL, -- act, regulation, rule, code
  source_url TEXT,
  short_title TEXT,
  long_title TEXT,
  preamble TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(act_name, year, jurisdiction)
);

-- Sections within Acts
CREATE TABLE public.act_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  act_id UUID NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,
  section_number TEXT NOT NULL,
  section_title TEXT,
  section_content TEXT NOT NULL,
  section_level INTEGER NOT NULL DEFAULT 1, -- 1=section, 2=subsection, 3=paragraph
  parent_section_id UUID REFERENCES act_sections(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  effective_date DATE,
  amendment_history JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(act_id, section_number)
);

-- Case Law
CREATE TABLE public.legal_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_name TEXT NOT NULL,
  neutral_citation TEXT UNIQUE,
  traditional_citation TEXT,
  court_id UUID REFERENCES nsw_courts(id),
  division TEXT, -- Family, Civil, Criminal, etc.
  year INTEGER NOT NULL,
  judgment_date DATE,
  catchwords TEXT[],
  judges TEXT[],
  parties JSONB, -- {"applicant": ["Name"], "respondent": ["Name"]}
  case_summary TEXT,
  legal_principles TEXT[],
  outcome TEXT, -- dismissed, allowed, upheld, etc.
  precedent_value TEXT, -- binding, persuasive, non-binding
  subject_matter TEXT[], -- AVO, parenting, property, practice
  source_url TEXT,
  full_text_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Practice Directions and Court Rules
CREATE TABLE public.practice_directions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pd_number TEXT NOT NULL,
  title TEXT NOT NULL,
  court_id UUID REFERENCES nsw_courts(id),
  division TEXT,
  effective_date DATE NOT NULL,
  supersedes_pd_id UUID REFERENCES practice_directions(id),
  status TEXT NOT NULL DEFAULT 'current', -- current, superseded, withdrawn
  subject_areas TEXT[], -- procedural categories
  content TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pd_number, court_id)
);

-- Legal Forms
CREATE TABLE public.legal_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_number TEXT NOT NULL,
  form_title TEXT NOT NULL,
  form_type TEXT NOT NULL, -- application, affidavit, notice, order
  court_id UUID REFERENCES nsw_courts(id),
  jurisdiction TEXT NOT NULL DEFAULT 'NSW',
  purpose TEXT NOT NULL,
  related_legislation TEXT[],
  instructions TEXT,
  form_fields JSONB DEFAULT '[]', -- Field definitions for smart filling
  pdf_url TEXT,
  effective_date DATE,
  status TEXT NOT NULL DEFAULT 'current',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(form_number, court_id)
);

-- Police Policies and Procedures
CREATE TABLE public.police_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_number TEXT NOT NULL UNIQUE,
  policy_title TEXT NOT NULL,
  policy_type TEXT NOT NULL, -- operational, procedural, guidance
  subject_area TEXT NOT NULL, -- domestic_violence, general, traffic
  effective_date DATE NOT NULL,
  review_date DATE,
  status TEXT NOT NULL DEFAULT 'current',
  authority TEXT, -- NSW Police Commissioner, etc.
  content TEXT NOT NULL,
  related_legislation TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal Entity Relationships
CREATE TABLE public.legal_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_entity_type TEXT NOT NULL, -- act_section, case, practice_direction, form, policy
  source_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- cites, interprets, modifies, supersedes, implements, refers_to
  relationship_strength REAL DEFAULT 1.0, -- 0.0 to 1.0
  relationship_description TEXT,
  context TEXT, -- Where/how the relationship appears
  verified BOOLEAN DEFAULT false,
  created_by TEXT, -- auto, manual, ai
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_entity_type, source_entity_id, target_entity_type, target_entity_id, relationship_type)
);

-- Enhanced Metadata for Topics and Outcomes
CREATE TABLE public.legal_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_name TEXT NOT NULL UNIQUE,
  topic_category TEXT NOT NULL, -- family_law, criminal_law, civil_law, procedure
  parent_topic_id UUID REFERENCES legal_topics(id),
  description TEXT,
  keywords TEXT[],
  related_legislation TEXT[],
  typical_courts TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert core NSW legal topics
INSERT INTO public.legal_topics (topic_name, topic_category, description, keywords) VALUES
('AVO (Apprehended Violence Orders)', 'criminal_law', 'Applications for protection from domestic and personal violence', ARRAY['AVO', 'domestic violence', 'personal violence', 'protection order']),
('Parenting Orders', 'family_law', 'Court orders relating to care and contact with children', ARRAY['parenting orders', 'custody', 'contact', 'children', 'best interests']),
('Property Settlement', 'family_law', 'Division of assets and liabilities in family law matters', ARRAY['property settlement', 'assets', 'liabilities', 'just and equitable']),
('Court Practice and Procedure', 'procedure', 'Rules and procedures for court proceedings', ARRAY['practice', 'procedure', 'filing', 'service', 'directions']),
('Coercive Control', 'criminal_law', 'Pattern of controlling behavior in domestic relationships', ARRAY['coercive control', 'pattern of behavior', 'control', 'domestic relationship']),
('Child Support', 'family_law', 'Financial support for children', ARRAY['child support', 'maintenance', 'assessment', 'formula']),
('Breach Proceedings', 'criminal_law', 'Enforcement of court orders and breaches', ARRAY['breach', 'contravention', 'enforcement', 'penalty']);

-- Topic associations for entities
CREATE TABLE public.entity_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- act_section, case, practice_direction, form, policy
  entity_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES legal_topics(id),
  relevance_score REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, topic_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.legal_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.act_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_topics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access to legal entities (global legal knowledge)
CREATE POLICY "Legal acts are publicly viewable"
ON public.legal_acts FOR SELECT USING (true);

CREATE POLICY "Act sections are publicly viewable"  
ON public.act_sections FOR SELECT USING (true);

CREATE POLICY "Legal cases are publicly viewable"
ON public.legal_cases FOR SELECT USING (true);

CREATE POLICY "Practice directions are publicly viewable"
ON public.practice_directions FOR SELECT USING (true);

CREATE POLICY "Legal forms are publicly viewable"
ON public.legal_forms FOR SELECT USING (true);

CREATE POLICY "Police policies are publicly viewable"
ON public.police_policies FOR SELECT USING (true);

CREATE POLICY "Legal relationships are publicly viewable"
ON public.legal_relationships FOR SELECT USING (true);

CREATE POLICY "Legal topics are publicly viewable"
ON public.legal_topics FOR SELECT USING (true);

CREATE POLICY "Entity topics are publicly viewable"
ON public.entity_topics FOR SELECT USING (true);

-- Only service role and admins can modify these entities
CREATE POLICY "Only service role can modify legal acts"
ON public.legal_acts FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify act sections"
ON public.act_sections FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify legal cases"
ON public.legal_cases FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify practice directions"
ON public.practice_directions FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify legal forms"
ON public.legal_forms FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify police policies"
ON public.police_policies FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify legal relationships"
ON public.legal_relationships FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify legal topics"
ON public.legal_topics FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only service role can modify entity topics"
ON public.entity_topics FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_legal_acts_jurisdiction ON legal_acts(jurisdiction);
CREATE INDEX idx_legal_acts_year ON legal_acts(year);
CREATE INDEX idx_legal_acts_status ON legal_acts(status);

CREATE INDEX idx_act_sections_act_id ON act_sections(act_id);
CREATE INDEX idx_act_sections_number ON act_sections(section_number);

CREATE INDEX idx_legal_cases_year ON legal_cases(year);
CREATE INDEX idx_legal_cases_court ON legal_cases(court_id);
CREATE INDEX idx_legal_cases_subject ON legal_cases USING GIN(subject_matter);
CREATE INDEX idx_legal_cases_neutral_citation ON legal_cases(neutral_citation);

CREATE INDEX idx_practice_directions_court ON practice_directions(court_id);
CREATE INDEX idx_practice_directions_effective_date ON practice_directions(effective_date);

CREATE INDEX idx_legal_forms_court ON legal_forms(court_id);
CREATE INDEX idx_legal_forms_type ON legal_forms(form_type);

CREATE INDEX idx_legal_relationships_source ON legal_relationships(source_entity_type, source_entity_id);
CREATE INDEX idx_legal_relationships_target ON legal_relationships(target_entity_type, target_entity_id);
CREATE INDEX idx_legal_relationships_type ON legal_relationships(relationship_type);

CREATE INDEX idx_entity_topics_entity ON entity_topics(entity_type, entity_id);
CREATE INDEX idx_entity_topics_topic ON entity_topics(topic_id);

-- Add triggers for updated_at
CREATE TRIGGER update_legal_acts_updated_at
BEFORE UPDATE ON public.legal_acts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_act_sections_updated_at
BEFORE UPDATE ON public.act_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_cases_updated_at
BEFORE UPDATE ON public.legal_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_directions_updated_at
BEFORE UPDATE ON public.practice_directions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_forms_updated_at
BEFORE UPDATE ON public.legal_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_police_policies_updated_at
BEFORE UPDATE ON public.police_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();