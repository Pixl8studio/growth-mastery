# Supabase Database Access for Claude Code

This document describes how Claude Code can directly interact with the GrowthMastery.ai Supabase database.

## Project Details

- **Project Name**: GrowthMastery.ai
- **Project ID**: `lbwawhiemqsqlqbnviou` (Management API access)
- **Region**: us-west-2
- **Database**: PostgreSQL 17.6.1
- **Host**: `db.lbwawhiemqsqlqbnviou.supabase.co`

Note: The app uses `ufndmgxmlceuoapgvfco` for runtime (NEXT_PUBLIC_SUPABASE_URL),
while `lbwawhiemqsqlqbnviou` is used for Management API database operations.

## Available Commands

Claude Code can execute these commands directly:

### Query the Database

```bash
pnpm db:query "SELECT * FROM table_name LIMIT 10"
```

### List All Tables

```bash
pnpm db:tables
```

### View Table Schema

```bash
pnpm db:schema table_name
```

### Run a Migration File

```bash
pnpm db:migrate supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

### Get Project Info

```bash
pnpm db:info
```

## Database Schema Overview

### Core Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User accounts, Stripe Connect, preferences |
| `funnel_projects` | Main project entity (supports soft delete) |
| `offers` | Product/service offerings with pricing |
| `deck_structures` | Slide deck templates |
| `gamma_decks` | Gamma.app integrations |
| `talk_tracks` | Presentation scripts |
| `pitch_videos` | Cloudflare Stream videos |
| `registration_pages` | Lead capture pages |
| `watch_pages` | Video viewing pages |
| `enrollment_pages` | Sales/checkout pages |
| `funnel_flows` | Page sequence orchestration |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `vapi_transcripts` | Voice call transcripts |
| `referral_codes` | Referral system |
| `talk_track_jobs` | Background job processing |
| `brand_designs` | Brand assets |
| `business_profiles` | Business information |
| `presentations` | Presentation management |
| `oauth_connections` | Third-party integrations |
| `custom_domains` | Custom domain support |

## Making Schema Changes

### Step 1: Create Migration File

Create a new file in `supabase/migrations/` with timestamp prefix:

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Example: `supabase/migrations/20260103120000_add_last_login.sql`

### Step 2: Write the Migration

Always use transactions and be explicit:

```sql
BEGIN;

-- Add column with default
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add index if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login
ON user_profiles(last_login);

COMMIT;
```

### Step 3: Run the Migration

```bash
pnpm db:migrate supabase/migrations/20260103120000_add_last_login.sql
```

### Step 4: Regenerate Types (if possible)

If the Supabase CLI is available:
```bash
pnpm db:types:remote
```

Otherwise, manually update `types/database.ts` to reflect the new schema.

## Common Operations

### Add a Column

```sql
BEGIN;
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name DATA_TYPE DEFAULT value;
COMMIT;
```

### Create a New Table

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Always add RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own rows"
  ON public.new_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rows"
  ON public.new_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_new_table_user ON public.new_table(user_id);

COMMIT;
```

### Add an Index

```sql
CREATE INDEX IF NOT EXISTS idx_table_column ON public.table_name(column_name);
```

### Create RLS Policy

```sql
CREATE POLICY "policy_name"
  ON public.table_name
  FOR ALL
  USING (auth.uid() = user_id);
```

## Safety Guidelines

1. **Always use transactions** - Wrap DDL in `BEGIN;` / `COMMIT;`
2. **Use IF EXISTS / IF NOT EXISTS** - Makes migrations idempotent
3. **Never DROP without backup** - Especially in production
4. **Test queries first** - Use `pnpm db:query` to test SELECT before running DDL
5. **Add RLS policies** - Every new table needs Row Level Security
6. **Create indexes** - For columns used in WHERE, JOIN, or ORDER BY

## Checking Current State

Before making changes, verify current state:

```bash
# List all tables
pnpm db:tables

# Check a specific table's structure
pnpm db:schema user_profiles

# Query existing data
pnpm db:query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles'"
```

## Troubleshooting

### "Permission denied"

The access token may have expired. Get a new one from:
https://supabase.com/dashboard/account/tokens

### "Table not found"

Check the table exists in public schema:
```bash
pnpm db:query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```

### Migration Failed

1. Check the error message
2. Fix the SQL syntax
3. If partially applied, you may need to manually clean up
4. Re-run the corrected migration
