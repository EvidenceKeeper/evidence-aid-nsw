-- Create comprehensive evidence analysis tables

-- Enhanced timeline events with legal context
CREATE TABLE IF NOT EXISTS enhanced_timeline_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    file_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.5,
    legal_significance TEXT,
    evidence_type TEXT,
    potential_witnesses TEXT[],
    corroboration_needed TEXT,
    context TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comprehensive evidence analysis storage
CREATE TABLE IF NOT EXISTS evidence_comprehensive_analysis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    file_id UUID NOT NULL,
    analysis_passes JSONB NOT NULL DEFAULT '[]'::jsonb,
    synthesis JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_score REAL DEFAULT 0.5,
    legal_strength INTEGER DEFAULT 0,
    case_impact TEXT,
    key_insights TEXT[],
    strategic_recommendations TEXT[],
    evidence_gaps_identified TEXT[],
    pattern_connections JSONB DEFAULT '[]'::jsonb,
    timeline_significance TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Case patterns with enhanced tracking
CREATE TABLE IF NOT EXISTS case_patterns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    pattern_type TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_files UUID[],
    pattern_strength REAL DEFAULT 0.5,
    timeline_start DATE,
    timeline_end DATE,
    legal_significance TEXT,
    escalation_indicator BOOLEAN DEFAULT false,
    corroboration_status TEXT DEFAULT 'needs_verification',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced case intelligence synthesis
CREATE TABLE IF NOT EXISTS case_intelligence_synthesis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    overall_case_strength REAL DEFAULT 0.0,
    evidence_completeness REAL DEFAULT 0.0,
    pattern_coherence REAL DEFAULT 0.0,
    timeline_clarity REAL DEFAULT 0.0,
    legal_foundation_strength REAL DEFAULT 0.0,
    key_strengths JSONB DEFAULT '[]'::jsonb,
    critical_weaknesses JSONB DEFAULT '[]'::jsonb,
    evidence_gaps JSONB DEFAULT '[]'::jsonb,
    strategic_priorities JSONB DEFAULT '[]'::jsonb,
    next_steps JSONB DEFAULT '[]'::jsonb,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    last_analysis DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE enhanced_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_comprehensive_analysis ENABLE ROW LEVEL SECURITY;  
ALTER TABLE case_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_intelligence_synthesis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for enhanced_timeline_events
CREATE POLICY "Users can view their enhanced timeline events" 
ON enhanced_timeline_events FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their enhanced timeline events" 
ON enhanced_timeline_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their enhanced timeline events" 
ON enhanced_timeline_events FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their enhanced timeline events" 
ON enhanced_timeline_events FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for evidence_comprehensive_analysis
CREATE POLICY "Users can view their evidence analysis" 
ON evidence_comprehensive_analysis FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their evidence analysis" 
ON evidence_comprehensive_analysis FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their evidence analysis" 
ON evidence_comprehensive_analysis FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for case_patterns
CREATE POLICY "Users can view their case patterns" 
ON case_patterns FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their case patterns" 
ON case_patterns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their case patterns" 
ON case_patterns FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their case patterns" 
ON case_patterns FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for case_intelligence_synthesis  
CREATE POLICY "Users can view their case intelligence" 
ON case_intelligence_synthesis FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their case intelligence" 
ON case_intelligence_synthesis FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their case intelligence" 
ON case_intelligence_synthesis FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_enhanced_timeline_events_user_date ON enhanced_timeline_events(user_id, event_date);
CREATE INDEX idx_evidence_comprehensive_analysis_user_file ON evidence_comprehensive_analysis(user_id, file_id);
CREATE INDEX idx_case_patterns_user_type ON case_patterns(user_id, pattern_type);
CREATE INDEX idx_case_intelligence_user ON case_intelligence_synthesis(user_id);

-- Create updated_at trigger for comprehensive analysis
CREATE TRIGGER update_evidence_comprehensive_analysis_updated_at
    BEFORE UPDATE ON evidence_comprehensive_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_intelligence_synthesis_updated_at
    BEFORE UPDATE ON case_intelligence_synthesis  
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();