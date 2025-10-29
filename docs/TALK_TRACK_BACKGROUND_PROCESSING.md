# Talk Track Background Processing - Deployment Guide

This document explains how to deploy the Talk Track background processing feature using
Supabase Edge Functions.

## Overview

Talk Track generation now runs as a background job in Supabase Edge Functions, allowing
users to navigate away during the 2-5 minute generation process. The system polls for
status updates and notifies users upon completion.

## Architecture

1. **Frontend** → POST to Next.js API `/api/generate/talk-track`
2. **Next.js API** → Creates job record in DB, invokes Supabase Edge Function, returns
   job ID immediately (<1s)
3. **Supabase Edge Function** → Generates talk track in chunks, updates job progress,
   saves result (2-5 minutes)
4. **Frontend** → Polls job status every 3 seconds, displays progress, allows navigation
5. **On Completion** → Shows toast notification, displays result

## Prerequisites

- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Supabase project configured
- OpenAI API key

## Deployment Steps

### 1. Run Database Migration

Apply the migration that creates the `talk_track_jobs` table:

```bash
cd genie-v3
supabase db push
```

This creates the table with RLS policies for job tracking.

### 2. Deploy Supabase Edge Function

Deploy the Edge Function to your Supabase project:

```bash
supabase functions deploy generate-talk-track --no-verify-jwt
```

The `--no-verify-jwt` flag is necessary because the function is invoked with the anon
key.

### 3. Set Edge Function Secrets

Configure environment variables for the Edge Function:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Set Supabase service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Set Supabase URL
supabase secrets set SUPABASE_URL=your_supabase_project_url_here
```

You can find these values in your Supabase project settings:

- **OpenAI API Key**: From your OpenAI dashboard
- **Service Role Key**: Supabase → Settings → API → `service_role` key
- **Supabase URL**: Supabase → Settings → API → Project URL

### 4. Verify Deployment

Test the Edge Function directly:

```bash
# Create a test job record in your database first, then:
curl -X POST https://your-project.supabase.co/functions/v1/generate-talk-track \
  -H "Authorization: Bearer your_anon_key" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-job-id"}'
```

### 5. Deploy Next.js Application

Deploy the Next.js application to Vercel:

```bash
git push origin main
```

Vercel will automatically build and deploy the changes.

### 6. Verify Environment Variables

Ensure these environment variables are set in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## Testing the Feature

1. Navigate to Step 6 (Talk Track) in the funnel builder
2. Select a deck structure
3. Click "Generate Talk Track"
4. You should see:
   - Warning banner: "⚠️ Generating Talk Track – This may take 2–5 minutes..."
   - Progress indicator showing percentage
5. Navigate to a different step and return - generation should continue
6. When complete, you should see a toast notification

## Monitoring

### Check Edge Function Logs

View Edge Function logs in Supabase:

```bash
supabase functions logs generate-talk-track
```

Or view in Supabase Dashboard → Edge Functions → generate-talk-track → Logs

### Check Job Status

Query the database to see job status:

```sql
SELECT
  id,
  status,
  progress,
  current_chunk,
  total_chunks,
  created_at,
  started_at,
  completed_at,
  error_message
FROM talk_track_jobs
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Edge Function Not Invoking

**Symptom**: Jobs stay in "pending" status forever

**Solution**: Check Edge Function deployment and secrets:

```bash
# Verify function is deployed
supabase functions list

# Verify secrets are set
supabase secrets list

# Check function logs
supabase functions logs generate-talk-track
```

### OpenAI API Errors

**Symptom**: Jobs fail with OpenAI-related errors

**Solution**:

1. Verify OpenAI API key is correct: `supabase secrets set OPENAI_API_KEY=...`
2. Check OpenAI usage limits and quotas
3. Review Edge Function logs for specific error messages

### Database Permission Errors

**Symptom**: Edge Function can't update job status

**Solution**: Verify RLS policies allow service role to update jobs:

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'talk_track_jobs';

-- If needed, recreate policies from migration file
```

### Timeout Issues

**Symptom**: Edge Functions timing out for large decks

**Solution**: Edge Functions have generous timeouts but if hitting limits:

1. Check deck structure size - 55 slides should process in <5 minutes
2. Review OpenAI API response times
3. Consider adjusting chunk size in Edge Function code

## Cleanup

Remove old completed jobs periodically:

```sql
-- Delete jobs older than 7 days
DELETE FROM talk_track_jobs
WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '7 days';
```

Consider setting up a Supabase cron job for automatic cleanup.

## Success Criteria

- ✅ Users can navigate away during generation
- ✅ Real-time progress indicator (0-100%)
- ✅ Warning banner with estimated time
- ✅ Toast notification on completion
- ✅ Works on Vercel Hobby plan (10s timeout)
- ✅ Green check icon in sidebar after completion

## Support

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check Vercel deployment logs
3. Review browser console for frontend errors
4. Query `talk_track_jobs` table to see job status
