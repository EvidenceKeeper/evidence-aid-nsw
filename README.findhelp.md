# Find Help Feature Setup

## Quick Start

1. **Install dependencies** (already done):
   ```bash
   npm install express cors dotenv @types/express @types/cors concurrently tsx
   ```

2. **Create `.env` file** in the root directory:
   ```bash
   cp .env.example .env
   ```

3. **Get Google Places API Key**:
   - Go to [Google Cloud Console](https://console.developers.google.com/)
   - Create a new project or select existing one
   - Enable the Places API
   - Create credentials → API Key
   - Add the API key to your `.env` file:
     ```
     GOOGLE_PLACES_API_KEY=your_actual_api_key_here
     ```

4. **Run the application**:
   ```bash
   # Terminal 1 - Backend server
   npm run dev:server
   
   # Terminal 2 - Frontend
   npm run dev
   
   # OR run both together:
   npm run dev:full
   ```

## Features

✅ **Google Places API Integration**: Searches for legal aid, community legal centres, domestic violence support, courts, and housing assistance

✅ **Postcode Validation**: Validates 4-digit Australian postcodes

✅ **Multiple Search Queries**: Uses multiple targeted search queries to find comprehensive results

✅ **Result Normalization**: Standardizes all results into consistent format

✅ **Optional Supabase Integration**: Merges local database resources if Supabase is configured

✅ **Health Check Endpoint**: `/api/health` shows which services are configured

✅ **Error Handling**: Proper error messages and loading states

✅ **Responsive Design**: Works on mobile and desktop

✅ **Rate Limiting Ready**: Server-side API calls prevent client exposure

## API Endpoints

- `GET /api/health` - Check service configuration
- `GET /api/resources?postcode=2000` - Search resources by postcode

## Configuration

### Required
- `GOOGLE_PLACES_API_KEY` - Your Google Places API key

### Optional
- `SUPABASE_URL` - Your Supabase project URL (for local resource merging)
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `PORT` - Server port (defaults to 3001)

## File Structure

```
/
├── server/
│   └── index.ts              # Express backend server
├── src/
│   ├── hooks/
│   │   └── useFindHelp.ts    # React Query hooks
│   ├── components/
│   │   └── ResourceCard.tsx  # Resource display component
│   └── pages/
│       └── FindHelp.tsx      # Main find help page
├── .env.example              # Environment variables template
└── README.findhelp.md        # This file
```

## How It Works

1. User enters NSW postcode (e.g., 2000)
2. Frontend validates postcode format
3. Backend receives request and validates postcode again
4. Server searches Google Places API with multiple targeted queries:
   - Legal aid and community legal centres
   - Law society and legal help
   - Domestic violence support services
   - Court houses and legal services
   - Housing assistance and legal aid
5. Results are normalized and deduplicated
6. If Supabase is configured, local resources are merged
7. Frontend displays results in cards with:
   - Organization name and address
   - Website and phone links
   - Google Maps integration
   - Source indicator (Google vs Local)

## Troubleshooting

**"Google Places API is not configured"**
- Check your `.env` file has `GOOGLE_PLACES_API_KEY`
- Ensure the API key is valid
- Verify Places API is enabled in Google Cloud Console

**"Failed to fetch resources"**
- Check backend server is running on port 3001
- Verify CORS is properly configured
- Check browser console for detailed error messages

**No results found**
- Try different postcodes (2000, 2006, 3000, etc.)
- Some remote areas may have fewer results
- The system searches for legal aid, courts, and support services specifically

## Security Notes

- API keys are never exposed to the client
- All API calls go through the backend server
- Postcode validation prevents invalid requests
- CORS is configured for development (update for production)