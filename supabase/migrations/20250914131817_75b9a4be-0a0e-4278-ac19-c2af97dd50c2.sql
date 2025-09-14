-- Enhanced NSW Legal Entity-Relationship Model (v2)
-- Create structured legal knowledge graph with unique naming

-- NSW Legislation Acts
CREATE TABLE public.nsw_legislation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  act_name TEXT NOT NULL,
  act_number TEXT,
  year INTEGER NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'NSW',
  status TEXT NOT NULL DEFAULT 'current', -- current, repealed, amended
  commencement_date DATE,
  repeal_date DATE,
  parent_act_id UUID REFERENCES nsw_legislation(id),
  act_type TEXT NOT NULL, -- act, regulation, rule, code
  source_url TEXT,
  short_title TEXT,
  long_title TEXT,
  preamble TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(act_name, year, jurisdiction)
);

-- Sections within NSW Legislation
CREATE TABLE public.nsw_legislation_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legislation_id UUID NOT NULL REFERENCES nsw_legislation(id) ON DELETE CASCADE,
  section_number TEXT NOT NULL,
  section_title TEXT,
  section_content TEXT NOT NULL,
  section_level INTEGER NOT NULL DEFAULT 1, -- 1=section, 2=subsection, 3=paragraph
  parent_section_id UUID REFERENCES nsw_legislation_sections(id),
  order_index INTEGER NOT NULL DEFAULT 0,
  effective_date DATE,
  amendment_history JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(legislation_id, section_number)
);

-- NSW Case Law Database  
CREATE TABLE public.nsw_case_law (
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
  legislation_cited TEXT[], -- Acts and sections referenced
  source_url TEXT,
  full_text_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NSW Court Practice Directions
CREATE TABLE public.nsw_practice_directions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pd_number TEXT NOT NULL,
  title TEXT NOT NULL,
  court_id UUID REFERENCES nsw_courts(id),
  division TEXT,
  effective_date DATE NOT NULL,
  supersedes_pd_id UUID REFERENCES nsw_practice_directions(id),
  status TEXT NOT NULL DEFAULT 'current', -- current, superseded, withdrawn
  subject_areas TEXT[], -- procedural categories
  content TEXT NOT NULL,
  related_legislation TEXT[],
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pd_number, court_id)
);

-- NSW Legal Forms Repository
CREATE TABLE public.nsw_legal_forms (
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
  filing_fee DECIMAL(10,2),
  processing_time_days INTEGER,
  required_documents TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(form_number, court_id)
);

-- NSW Police Operational Policies
CREATE TABLE public.nsw_police_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_number TEXT NOT NULL UNIQUE,
  policy_title TEXT NOT NULL,
  policy_type TEXT NOT NULL, -- operational, procedural, guidance
  subject_area TEXT NOT NULL, -- domestic_violence, general, traffic, investigation
  effective_date DATE NOT NULL,
  review_date DATE,
  status TEXT NOT NULL DEFAULT 'current',
  authority TEXT, -- NSW Police Commissioner, etc.
  content TEXT NOT NULL,
  related_legislation TEXT[],
  compliance_requirements TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal Entity Relationships Graph
CREATE TABLE public.nsw_legal_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_entity_type TEXT NOT NULL, -- legislation_section, case, practice_direction, form, policy
  source_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- cites, interprets, modifies, supersedes, implements, refers_to, contradicts
  relationship_strength REAL DEFAULT 1.0, -- 0.0 to 1.0 confidence
  relationship_description TEXT,
  context TEXT, -- Where/how the relationship appears
  extracted_by TEXT DEFAULT 'ai', -- ai, manual, verified
  verification_status TEXT DEFAULT 'unverified', -- verified, unverified, disputed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_entity_type, source_entity_id, target_entity_type, target_entity_id, relationship_type)
);

-- Enhanced Legal Topic Taxonomy  
CREATE TABLE public.nsw_legal_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_name TEXT NOT NULL UNIQUE,
  topic_category TEXT NOT NULL, -- family_law, criminal_law, civil_law, procedure
  parent_topic_id UUID REFERENCES nsw_legal_topics(id),
  topic_level INTEGER NOT NULL DEFAULT 1, -- 1=category, 2=subcategory, 3=specific
  description TEXT,
  keywords TEXT[],
  synonyms TEXT[],
  related_legislation TEXT[],
  typical_courts TEXT[],
  complexity_level TEXT DEFAULT 'intermediate', -- basic, intermediate, advanced
  practitioner_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert structured NSW legal topic taxonomy
INSERT INTO public.nsw_legal_topics (topic_name, topic_category, topic_level, description, keywords, complexity_level) VALUES
-- Top Level Categories
('Family Law', 'family_law', 1, 'All matters relating to family relationships, children, and property', ARRAY['family law', 'family court'], 'intermediate'),
('Criminal Law', 'criminal_law', 1, 'Criminal offences, penalties, and court proceedings', ARRAY['criminal law', 'criminal offences'], 'advanced'),
('Civil Law', 'civil_law', 1, 'Civil disputes, contracts, and remedies', ARRAY['civil law', 'civil proceedings'], 'intermediate'),
('Court Procedure', 'procedure', 1, 'Rules, practice, and court procedures', ARRAY['court procedure', 'practice'], 'basic'),

-- Family Law Subcategories
('AVO (Apprehended Violence Orders)', 'criminal_law', 2, 'Applications for protection from domestic and personal violence', ARRAY['AVO', 'domestic violence', 'personal violence', 'protection order', 'apprehended violence order'], 'intermediate'),
('Parenting Orders', 'family_law', 2, 'Court orders relating to care and contact with children', ARRAY['parenting orders', 'custody', 'contact', 'children', 'best interests'], 'advanced'),
('Property Settlement', 'family_law', 2, 'Division of assets and liabilities in family law matters', ARRAY['property settlement', 'assets', 'liabilities', 'just and equitable', 'financial agreement'], 'advanced'),
('Child Support', 'family_law', 2, 'Financial support obligations for children', ARRAY['child support', 'maintenance', 'assessment', 'formula', 'services australia'], 'intermediate'),

-- Criminal Law Subcategories  
('Coercive Control', 'criminal_law', 2, 'Pattern of controlling behavior in domestic relationships', ARRAY['coercive control', 'pattern of behavior', 'control', 'domestic relationship', 'intimidation'], 'advanced'),
('Domestic Violence Offences', 'criminal_law', 2, 'Criminal offences in domestic violence context', ARRAY['domestic violence', 'assault', 'stalking', 'intimidation', 'harassment'], 'intermediate'),
('Breach Proceedings', 'criminal_law', 2, 'Enforcement of court orders and breaches', ARRAY['breach', 'contravention', 'enforcement', 'penalty', 'contempt'], 'intermediate'),

-- Procedure Subcategories
('Filing and Service', 'procedure', 2, 'Document filing and service requirements', ARRAY['filing', 'service', 'documents', 'deadlines', 'registry'], 'basic'),
('Court Directions', 'procedure', 2, 'Case management and court directions', ARRAY['directions', 'case management', 'timetable', 'interim orders'], 'basic'),
('Evidence and Hearings', 'procedure', 2, 'Rules of evidence and hearing procedures', ARRAY['evidence', 'hearing', 'witnesses', 'examination', 'cross-examination'], 'intermediate');

-- Entity-Topic Associations
CREATE TABLE public.nsw_entity_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- legislation_section, case, practice_direction, form, policy  
  entity_id UUID NOT NULL,
  topic_id UUID NOT NULL REFERENCES nsw_legal_topics(id),
  relevance_score REAL NOT NULL DEFAULT 1.0, -- 0.0 to 1.0
  confidence_score REAL DEFAULT 1.0, -- AI confidence in topic assignment
  assigned_by TEXT DEFAULT 'ai', -- ai, manual, verified
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, topic_id)
);

-- Legal Outcomes and Precedent Values
CREATE TABLE public.nsw_legal_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES nsw_case_law(id),
  outcome_type TEXT NOT NULL, -- granted, dismissed, allowed, remitted, settled
  outcome_description TEXT,
  orders_made TEXT[],
  costs_order TEXT,
  precedent_established TEXT,
  legal_principle TEXT,
  binding_courts TEXT[], -- Which courts this binds
  distinguished_cases UUID[], -- Cases that distinguish this one
  followed_cases UUID[], -- Cases that follow this one
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.nsw_legislation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_legislation_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_case_law ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_practice_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_legal_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_police_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_legal_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_legal_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_entity_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsw_legal_outcomes ENABLE ROW LEVEL SECURITY;

-- Public read access for legal knowledge
CREATE POLICY "NSW legislation is publicly viewable" ON public.nsw_legislation FOR SELECT USING (true);
CREATE POLICY "NSW legislation sections are publicly viewable" ON public.nsw_legislation_sections FOR SELECT USING (true);
CREATE POLICY "NSW case law is publicly viewable" ON public.nsw_case_law FOR SELECT USING (true);
CREATE POLICY "NSW practice directions are publicly viewable" ON public.nsw_practice_directions FOR SELECT USING (true);
CREATE POLICY "NSW legal forms are publicly viewable" ON public.nsw_legal_forms FOR SELECT USING (true);
CREATE POLICY "NSW police policies are publicly viewable" ON public.nsw_police_policies FOR SELECT USING (true);
CREATE POLICY "NSW legal relationships are publicly viewable" ON public.nsw_legal_relationships FOR SELECT USING (true);
CREATE POLICY "NSW legal topics are publicly viewable" ON public.nsw_legal_topics FOR SELECT USING (true);
CREATE POLICY "NSW entity topics are publicly viewable" ON public.nsw_entity_topics FOR SELECT USING (true);
CREATE POLICY "NSW legal outcomes are publicly viewable" ON public.nsw_legal_outcomes FOR SELECT USING (true);

-- Admin/service modification policies
CREATE POLICY "Only service role can modify NSW legislation" ON public.nsw_legislation FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW legislation sections" ON public.nsw_legislation_sections FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW case law" ON public.nsw_case_law FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW practice directions" ON public.nsw_practice_directions FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW legal forms" ON public.nsw_legal_forms FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW police policies" ON public.nsw_police_policies FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW legal relationships" ON public.nsw_legal_relationships FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW legal topics" ON public.nsw_legal_topics FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW entity topics" ON public.nsw_entity_topics FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only service role can modify NSW legal outcomes" ON public.nsw_legal_outcomes FOR ALL USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- Performance indexes
CREATE INDEX idx_nsw_legislation_jurisdiction ON nsw_legislation(jurisdiction);
CREATE INDEX idx_nsw_legislation_year ON nsw_legislation(year);
CREATE INDEX idx_nsw_legislation_status ON nsw_legislation(status);
CREATE INDEX idx_nsw_legislation_type ON nsw_legislation(act_type);

CREATE INDEX idx_nsw_case_law_year ON nsw_case_law(year);
CREATE INDEX idx_nsw_case_law_court ON nsw_case_law(court_id);
CREATE INDEX idx_nsw_case_law_subject ON nsw_case_law USING GIN(subject_matter);
CREATE INDEX idx_nsw_case_law_citation ON nsw_case_law(neutral_citation);
CREATE INDEX idx_nsw_case_law_outcome ON nsw_case_law(outcome);

CREATE INDEX idx_nsw_legal_forms_type ON nsw_legal_forms(form_type);
CREATE INDEX idx_nsw_legal_forms_court ON nsw_legal_forms(court_id);

CREATE INDEX idx_nsw_relationships_source ON nsw_legal_relationships(source_entity_type, source_entity_id);
CREATE INDEX idx_nsw_relationships_target ON nsw_legal_relationships(target_entity_type, target_entity_id);
CREATE INDEX idx_nsw_relationships_type ON nsw_legal_relationships(relationship_type);

CREATE INDEX idx_nsw_topics_category ON nsw_legal_topics(topic_category);
CREATE INDEX idx_nsw_topics_level ON nsw_legal_topics(topic_level);

CREATE INDEX idx_nsw_entity_topics_entity ON nsw_entity_topics(entity_type, entity_id);
CREATE INDEX idx_nsw_entity_topics_topic ON nsw_entity_topics(topic_id);

-- Update triggers
CREATE TRIGGER update_nsw_legislation_updated_at BEFORE UPDATE ON public.nsw_legislation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nsw_legislation_sections_updated_at BEFORE UPDATE ON public.nsw_legislation_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nsw_case_law_updated_at BEFORE UPDATE ON public.nsw_case_law FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nsw_practice_directions_updated_at BEFORE UPDATE ON public.nsw_practice_directions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nsw_legal_forms_updated_at BEFORE UPDATE ON public.nsw_legal_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nsw_police_policies_updated_at BEFORE UPDATE ON public.nsw_police_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();