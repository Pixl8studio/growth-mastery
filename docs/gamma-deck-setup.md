# Gamma Deck Generation Setup

## Overview

The Gamma deck generation feature has been restored in genie-v3, adapted from the
working implementation in genie-v1.

## Changes Made

### 1. API Endpoint Created

**File**: `/app/api/generate/gamma-decks/route.ts`

This endpoint handles:

- Fetching deck structure from the database
- Preparing content for Gamma AI
- Calling the Gamma API to generate presentations
- Polling for completion
- Updating the database with results

### 2. Database Migration

**File**: `/supabase/migrations/20250123000010_add_gamma_deck_fields.sql`

Added missing columns to `gamma_decks` table:

- `title` - Direct title field (previously in metadata)
- `settings` - JSONB containing theme, style, length
- `status` - User-friendly status field ('generating', 'completed', 'failed')

The migration also:

- Adds constraints to ensure valid status values
- Creates an index on status for performance
- Migrates existing data from metadata fields

### 3. Environment Variables Required

Add to your `.env.local` or environment:

```bash
# New format (recommended)
GAMMA_API_KEY=sk-gamma-your_key_here

# Legacy format (still supported)
GAMMA_AI_API=your_gamma_api_key_here
```

The API will check for either variable name for backward compatibility.

**Important:** The Gamma API key format starts with `sk-gamma-`. Get your key from
https://gamma.app/settings/api

## How It Works

1. **User clicks "Generate Gamma Deck"** on Step 4
2. **Frontend** calls `POST /api/generate/gamma-decks` with:
   - `projectId` - The funnel project ID
   - `deckStructureId` - Which deck structure to use
   - `settings` - Theme, style, length preferences

3. **API** creates a gamma_decks record with status "generating"

4. **API** prepares content:
   - Extracts slides from deck structure
   - Formats as markdown for Gamma
   - Applies theme and style settings

5. **API** calls Gamma:
   - Starts generation
   - Polls every 5 seconds for completion (max 5 minutes)
   - Updates database when complete

6. **Frontend** refreshes and shows the completed deck with link

## Gamma API Configuration

The endpoint uses Gamma's v0.2 API:

- **Endpoint**: `https://public-api.gamma.app/v0.2/generations`
- **Authentication**: X-API-KEY header
- **Response**: Generation ID for polling
- **Status check**: GET `/v0.2/generations/{generationId}`

### Request Parameters

- `inputText` - Markdown content for the deck
- `themeName` - Gamma theme (e.g., "nebulae", "pitch", "morning")
- `numCards` - Number of slides (5 for test, 55 for full)
- `textMode` - "generate" (let Gamma expand content)
- `format` - "presentation"
- `textOptions` - Tone, audience, language
- `imageOptions` - AI image generation settings

## Testing

To test the endpoint:

```bash
curl http://localhost:3000/api/generate/gamma-decks
```

Should return:

```json
{
  "message": "Gamma deck generation endpoint",
  "usage": "POST with projectId, deckStructureId, and settings",
  "status": "ready"
}
```

If status is "missing API key", add the GAMMA_API_KEY environment variable.

## Database Schema

The `gamma_decks` table now has these key fields:

```sql
- id (UUID, primary key)
- funnel_project_id (UUID, references funnel_projects)
- deck_structure_id (UUID, references deck_structures)
- user_id (UUID, references auth.users)
- title (TEXT) -- NEW
- settings (JSONB) -- NEW
- status (TEXT) -- NEW: 'generating', 'completed', 'failed'
- generation_status (TEXT) -- Original field, kept for compatibility
- gamma_session_id (TEXT) -- Gamma generation ID
- deck_url (TEXT) -- Link to view deck
- deck_data (JSONB) -- Additional metadata
- created_at (TIMESTAMPTZ)
```

## Frontend Integration

The frontend at `/app/funnel-builder/[projectId]/step/4/page.tsx`:

- Displays deck structure dropdown
- Shows theme selector (GammaThemeSelector component)
- Generates on button click
- Polls backend and shows progress
- Lists completed decks with edit/delete actions

## Troubleshooting

### 404 Error

✅ **FIXED** - The endpoint now exists at `/api/generate/gamma-decks`

### "GAMMA_API_KEY not configured"

Add the environment variable and restart the dev server.

**To update the API key:**

1. For local development: Update `GAMMA_API_KEY` in your `.env.local` file
2. For production (Vercel): Update the environment variable in Vercel Dashboard →
   Settings → Environment Variables
3. Restart the server/redeploy after updating

The key format should be: `sk-gamma-XXXXXXXXXXXXX`

### "Deck structure not found"

Ensure Step 3 (Deck Structure) is completed first

### Generation times out

Default timeout is 5 minutes. Large decks (55 slides) may take 2-3 minutes.

### Database errors on migration

Run the migration manually:

```bash
# If using Supabase CLI
supabase db push

# Or apply via Supabase dashboard SQL editor
```

## Next Steps

1. ✅ Add GAMMA_API_KEY to environment (format: `sk-gamma-XXXXX`)
2. ✅ Apply database migration
3. ✅ Restart dev server
4. ✅ Test generation on Step 5 (Create Presentation)

The implementation is complete and matches the working v1 implementation!

## Updating the Gamma API Key

When you need to update the Gamma API key:

**Local Development:**

```bash
# In .env.local
GAMMA_API_KEY=sk-gamma-your_new_key_here
```

**Production (Vercel):**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `GAMMA_API_KEY` and update the value
3. Redeploy the application (or trigger a new deployment)

**Validation:** After updating, test by navigating to Step 5 in the funnel builder and
generating a presentation.
