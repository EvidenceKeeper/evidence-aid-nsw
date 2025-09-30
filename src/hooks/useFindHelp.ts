import { useQuery } from '@tanstack/react-query';

export interface Resource {
  source: 'Google' | 'Local';
  name: string;
  address: string;
  website?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  place_id?: string;
}

interface ResourcesResponse {
  success: boolean;
  postcode: string;
  total: number;
  sources: {
    google: number;
    local: number;
  };
  results: Resource[];
}

interface HealthResponse {
  status: string;
  configured: {
    googlePlaces: boolean;
    supabase: boolean;
  };
  timestamp: string;
}

import { supabase } from '@/integrations/supabase/client';

async function fetchResources(postcode: string): Promise<ResourcesResponse> {
  const { data, error } = await supabase.functions.invoke('find-nsw-resources', {
    body: { postcode }
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to fetch resources');
  }
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch resources');
  }
  
  return data;
}

async function fetchHealth(): Promise<HealthResponse> {
  // Check if the edge function exists by making a simple call
  try {
    await supabase.functions.invoke('find-nsw-resources', {
      body: { postcode: '2000' }
    });
    return {
      status: 'healthy',
      configured: {
        googlePlaces: true,
        supabase: true,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      configured: {
        googlePlaces: false,
        supabase: false,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export function useFindHelp(postcode: string) {
  return useQuery({
    queryKey: ['resources', postcode],
    queryFn: () => fetchResources(postcode),
    enabled: !!postcode && /^\d{4}$/.test(postcode.trim()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });
}