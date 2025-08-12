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

const API_BASE = 'http://localhost:3001/api';

async function fetchResources(postcode: string): Promise<ResourcesResponse> {
  const response = await fetch(`${API_BASE}/resources?postcode=${encodeURIComponent(postcode)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch resources');
  }
  
  return response.json();
}

async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch health status');
  }
  
  return response.json();
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