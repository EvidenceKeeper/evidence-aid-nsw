import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CitationMode = 'user' | 'lawyer' | 'auto';

interface CitationContext {
  mode: CitationMode;
  showCitations: boolean;
  userRole: string | null;
  isLawyerConsultation: boolean;
}

export function useCitationContext(consultationId?: string) {
  const [context, setContext] = useState<CitationContext>({
    mode: 'auto',
    showCitations: false,
    userRole: null,
    isLawyerConsultation: false,
  });

  useEffect(() => {
    determineContext();
  }, [consultationId]);

  const determineContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = roleData?.role || 'user';
      
      // Check if we're in a lawyer consultation context
      const isLawyerConsultation = Boolean(consultationId);
      
      // Determine citation mode
      let mode: CitationMode = 'user';
      let showCitations = false;

      if (userRole === 'lawyer' || userRole === 'admin') {
        mode = 'lawyer';
        showCitations = true; // Lawyers always see citations
      } else if (isLawyerConsultation) {
        mode = 'user';
        showCitations = false; // Users in consultations see clean responses unless requested
      } else {
        mode = 'auto';
        showCitations = false; // Auto-detect based on query content
      }

      setContext({
        mode,
        showCitations,
        userRole,
        isLawyerConsultation,
      });
    } catch (error) {
      console.error('Error determining citation context:', error);
    }
  };

  const shouldShowCitations = (queryText?: string): boolean => {
    // Always show if in lawyer mode
    if (context.mode === 'lawyer') {
      return true;
    }

    // Never show in user mode unless explicitly requested
    if (context.mode === 'user') {
      return detectCitationRequest(queryText);
    }

    // Auto mode - detect based on query
    if (context.mode === 'auto') {
      return detectCitationRequest(queryText);
    }

    return false;
  };

  const detectCitationRequest = (queryText?: string): boolean => {
    if (!queryText) return false;

    const citationKeywords = [
      'citation',
      'cite',
      'source',
      'reference',
      'authority',
      'case law',
      'statute',
      'section',
      'act',
      'regulation',
      'legal basis',
      'what law',
      'which section',
      'court case',
      'precedent',
      'show me the law',
      'legal reference',
      'where does it say',
      'prove it',
      'evidence for this',
      'legal support',
    ];

    const lowerQuery = queryText.toLowerCase();
    return citationKeywords.some(keyword => lowerQuery.includes(keyword));
  };

  const getDisplayMode = (): 'user' | 'lawyer' => {
    return context.mode === 'lawyer' ? 'lawyer' : 'user';
  };

  return {
    context,
    shouldShowCitations,
    detectCitationRequest,
    getDisplayMode,
    refreshContext: determineContext,
  };
}