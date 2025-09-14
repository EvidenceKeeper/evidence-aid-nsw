import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EvidenceIntegrationSettings {
  enabled: boolean;
  autoAnalyze: boolean;
  includeWeakConnections: boolean;
  minRelevanceScore: number;
}

export function useEvidenceIntegration() {
  const [settings, setSettings] = useState<EvidenceIntegrationSettings>({
    enabled: false,
    autoAnalyze: true,
    includeWeakConnections: false,
    minRelevanceScore: 0.6,
  });
  const [loading, setLoading] = useState(true);
  const [hasConnections, setHasConnections] = useState(false);

  useEffect(() => {
    loadSettings();
    checkConnections();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = localStorage.getItem('evidenceIntegrationSettings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading evidence integration settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('evidence_legal_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('relevance_score', settings.minRelevanceScore);

      if (error) throw error;
      setHasConnections((count || 0) > 0);
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  };

  const updateSettings = (newSettings: Partial<EvidenceIntegrationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('evidenceIntegrationSettings', JSON.stringify(updated));
    
    // Recheck connections if relevance threshold changed
    if (newSettings.minRelevanceScore !== undefined) {
      checkConnections();
    }
  };

  const getEvidenceForQuery = async (query: string, maxResults: number = 10) => {
    if (!settings.enabled || !hasConnections) {
      return [];
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Use the database function to get evidence-informed advice
      const { data, error } = await supabase
        .rpc('get_evidence_informed_advice', {
          _user_id: user.id,
          _query: query,
          _include_evidence: true
        })
        .limit(maxResults);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting evidence for query:', error);
      return [];
    }
  };

  const getEvidenceConnections = async (fileId?: string, legalSectionId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('evidence_legal_connections')
        .select(`
          *,
          evidence_file:files!evidence_file_id(name),
          legal_section:legal_sections!legal_section_id(title, citation_format)
        `)
        .eq('user_id', user.id)
        .gte('relevance_score', settings.minRelevanceScore)
        .order('relevance_score', { ascending: false });

      if (fileId) {
        query = query.eq('evidence_file_id', fileId);
      }

      if (legalSectionId) {
        query = query.eq('legal_section_id', legalSectionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting evidence connections:', error);
      return [];
    }
  };

  return {
    settings,
    updateSettings,
    loading,
    hasConnections,
    refreshConnections: checkConnections,
    getEvidenceForQuery,
    getEvidenceConnections,
  };
}