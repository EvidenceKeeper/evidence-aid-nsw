import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Resource {
  source: 'Google' | 'Local';
  name: string;
  address: string;
  website?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  place_id?: string;
}

function isValidAustralianPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode.trim());
}

function normalizeGooglePlace(place: any): Resource {
  return {
    source: 'Google',
    name: place.name || 'Unknown',
    address: place.formatted_address || 'Address not available',
    website: place.website || undefined,
    phone: place.international_phone_number || place.formatted_phone_number || undefined,
    lat: place.geometry?.location?.lat || undefined,
    lng: place.geometry?.location?.lng || undefined,
    place_id: place.place_id || undefined,
  };
}

async function searchGooglePlaces(postcode: string, apiKey: string): Promise<Resource[]> {
  const searchQueries = [
    `legal aid community legal centre domestic violence support court housing help ${postcode} NSW Australia`,
    `law society legal help ${postcode} NSW Australia`,
    `domestic violence support services ${postcode} NSW Australia`,
    `court house legal services ${postcode} NSW Australia`,
    `housing assistance legal aid ${postcode} NSW Australia`
  ];

  const allResults: Resource[] = [];

  for (const query of searchQueries) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
      );

      if (!response.ok) {
        console.error(`Google Places API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        const normalizedResults = data.results.slice(0, 5).map(normalizeGooglePlace);
        allResults.push(...normalizedResults);
      }
    } catch (error) {
      console.error('Error searching Google Places:', error);
    }
  }

  // Remove duplicates by name
  const uniqueResults = allResults.filter((result, index, self) => 
    index === self.findIndex(r => r.name.toLowerCase() === result.name.toLowerCase())
  );

  return uniqueResults.slice(0, 20);
}

async function searchLocalResources(postcode: string, supabase: any): Promise<Resource[]> {
  try {
    const { data, error } = await supabase.rpc('search_resources_by_postcode', {
      search_postcode: postcode
    });

    if (error) {
      console.error('Supabase search error:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((item: any): Resource => ({
      source: 'Local',
      name: item.name || 'Unknown',
      address: item.address || 'Address not available',
      website: item.website || undefined,
      phone: item.phone || undefined,
      lat: item.lat || undefined,
      lng: item.lng || undefined,
      place_id: undefined,
    }));
  } catch (error) {
    console.error('Error searching local resources:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postcode } = await req.json();

    if (!postcode || typeof postcode !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Postcode is required',
          message: 'Please provide a valid 4-digit Australian postcode'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!isValidAustralianPostcode(postcode)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid postcode',
          message: 'Please provide a valid 4-digit Australian postcode'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google Places API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search both sources in parallel
    const [googleResults, localResults] = await Promise.allSettled([
      searchGooglePlaces(postcode, googleApiKey),
      searchLocalResources(postcode, supabase),
    ]);

    const googleData = googleResults.status === 'fulfilled' ? googleResults.value : [];
    const localData = localResults.status === 'fulfilled' ? localResults.value : [];

    // Merge and deduplicate
    const allResults = [...googleData, ...localData];
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.name.toLowerCase() === result.name.toLowerCase())
    );

    console.log(`Found ${uniqueResults.length} resources for postcode ${postcode}`);

    return new Response(
      JSON.stringify({
        success: true,
        postcode,
        total: uniqueResults.length,
        sources: {
          google: googleData.length,
          local: localData.length,
        },
        results: uniqueResults,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in find-nsw-resources:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An error occurred while searching for resources'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
