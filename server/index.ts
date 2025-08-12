import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Environment variables
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client only if both URL and key are provided
let supabase: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Interface for standardized resource response
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

// Validate Australian postcode (4 digits)
function isValidAustralianPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode.trim());
}

// Normalize Google Places result to our Resource interface
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

// Search Google Places API
async function searchGooglePlaces(postcode: string): Promise<Resource[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

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
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
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

  return uniqueResults.slice(0, 20); // Limit to 20 results
}

// Search local Supabase resources (if available)
async function searchLocalResources(postcode: string): Promise<Resource[]> {
  if (!supabase) {
    return [];
  }

  try {
    // This would call a stored procedure in Supabase if it exists
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

    // Normalize Supabase results to our Resource interface
    return data.map((item: any): Resource => ({
      source: 'Local',
      name: item.name || 'Unknown',
      address: item.address || 'Address not available',
      website: item.website || undefined,
      phone: item.phone || undefined,
      lat: item.lat || undefined,
      lng: item.lng || undefined,
      place_id: undefined, // Local resources don't have place_id
    }));
  } catch (error) {
    console.error('Error searching local resources:', error);
    return [];
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    configured: {
      googlePlaces: !!GOOGLE_PLACES_API_KEY,
      supabase: !!supabase,
    },
    timestamp: new Date().toISOString(),
  });
});

// Main resources search endpoint
app.get('/api/resources', async (req, res) => {
  try {
    const { postcode } = req.query;

    if (!postcode || typeof postcode !== 'string') {
      return res.status(400).json({
        error: 'Postcode is required',
        message: 'Please provide a valid 4-digit Australian postcode'
      });
    }

    if (!isValidAustralianPostcode(postcode)) {
      return res.status(400).json({
        error: 'Invalid postcode',
        message: 'Please provide a valid 4-digit Australian postcode'
      });
    }

    // Search both Google Places and local resources in parallel
    const [googleResults, localResults] = await Promise.allSettled([
      searchGooglePlaces(postcode),
      searchLocalResources(postcode),
    ]);

    const googleData = googleResults.status === 'fulfilled' ? googleResults.value : [];
    const localData = localResults.status === 'fulfilled' ? localResults.value : [];

    // Merge and deduplicate results by name
    const allResults = [...googleData, ...localData];
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.name.toLowerCase() === result.name.toLowerCase())
    );

    res.json({
      success: true,
      postcode,
      total: uniqueResults.length,
      sources: {
        google: googleData.length,
        local: localData.length,
      },
      results: uniqueResults,
    });

  } catch (error) {
    console.error('Error in /api/resources:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while searching for resources'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log('Configured services:', {
    googlePlaces: !!GOOGLE_PLACES_API_KEY,
    supabase: !!supabase,
  });
});