-- Advanced Legal Knowledge System Schema (without pgvector for now)

-- Legal documents table (top level - acts, regulations, etc.)
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'act', 'regulation', 'case_law', 'procedure'
  jurisdiction TEXT NOT NULL DEFAULT 'NSW',
  version TEXT NOT NULL DEFAULT '1.0',
  effective_date DATE,
  source_url TEXT,
  total_sections INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal document structure (parts, chapters, sections, subsections)
CREATE TABLE public.legal_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  parent_section_id UUID REFERENCES legal_sections(id) ON DELETE CASCADE,
  section_number TEXT, -- e.g., "54D", "Part 3", "Chapter 2"
  section_type TEXT NOT NULL, -- 'part', 'chapter', 'section', 'subsection', 'paragraph'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1, -- hierarchy depth
  order_index INTEGER NOT NULL DEFAULT 0,
  citation_reference TEXT, -- full citation like "s 54D Crimes Act 1900 (NSW)"
  legal_concepts TEXT[], -- tags for semantic search
  cross_references UUID[], -- array of related section IDs
  embedding_data JSONB, -- store embedding as JSON for now
  tsv TSVECTOR, -- full text search
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal concept taxonomy for better semantic organization
CREATE TABLE public.legal_concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_name TEXT NOT NULL UNIQUE,
  parent_concept_id UUID REFERENCES legal_concepts(id) ON DELETE CASCADE,
  description TEXT,
  related_concepts UUID[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Search cache for performance optimization
CREATE TABLE public.legal_search_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  search_type TEXT NOT NULL, -- 'semantic', 'keyword', 'hybrid'
  results JSONB NOT NULL,
  hit_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_search_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for all legal content
CREATE POLICY "Legal documents are publicly viewable" ON public.legal_documents FOR SELECT USING (true);
CREATE POLICY "Legal sections are publicly viewable" ON public.legal_sections FOR SELECT USING (true);
CREATE POLICY "Legal concepts are publicly viewable" ON public.legal_concepts FOR SELECT USING (true);
CREATE POLICY "Legal search cache is publicly viewable" ON public.legal_search_cache FOR SELECT USING (true);

-- Admin-only write access (for now - can be expanded later)
CREATE POLICY "Only service role can modify legal documents" ON public.legal_documents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Only service role can modify legal sections" ON public.legal_sections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Only service role can modify legal concepts" ON public.legal_concepts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Only service role can modify search cache" ON public.legal_search_cache FOR ALL USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX idx_legal_sections_document_id ON legal_sections(document_id);
CREATE INDEX idx_legal_sections_parent_id ON legal_sections(parent_section_id);
CREATE INDEX idx_legal_sections_type_level ON legal_sections(section_type, level);
CREATE INDEX idx_legal_sections_concepts ON legal_sections USING GIN(legal_concepts);
CREATE INDEX idx_legal_sections_tsv ON legal_sections USING GIN(tsv);
CREATE INDEX idx_legal_search_cache_hash ON legal_search_cache(query_hash);
CREATE INDEX idx_legal_concepts_parent ON legal_concepts(parent_concept_id);

-- Function to update TSV for full-text search
CREATE OR REPLACE FUNCTION public.update_legal_sections_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv := to_tsvector('english', 
    coalesce(NEW.title, '') || ' ' || 
    coalesce(NEW.content, '') || ' ' || 
    coalesce(NEW.citation_reference, '') || ' ' ||
    coalesce(array_to_string(NEW.legal_concepts, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for TSV updates
CREATE TRIGGER legal_sections_tsv_update
  BEFORE INSERT OR UPDATE ON public.legal_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_legal_sections_tsv();

-- Triggers for timestamp updates
CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_sections_updated_at
  BEFORE UPDATE ON public.legal_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();