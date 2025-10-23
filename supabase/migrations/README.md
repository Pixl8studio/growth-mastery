# Supabase Migrations

This directory contains database migration files for Supabase.

## Creating Migrations

### Using Supabase CLI (Recommended)

```bash
# Create a new migration
supabase migration new your_migration_name

# This creates: supabase/migrations/YYYYMMDDHHMMSS_your_migration_name.sql
```

### Manually

Create a file with the format: `YYYYMMDDHHMMSS_description.sql`

Example: `20240123120000_create_users_table.sql`

## Migration Best Practices

1. **Use Transactions**: Wrap DDL statements in BEGIN/COMMIT
2. **Be Explicit**: Include `IF NOT EXISTS` or `IF EXISTS` where appropriate
3. **Test Locally**: Always test migrations locally before applying to production
4. **Rollback Plan**: Consider creating "down" migrations for reversibility
5. **Small Changes**: Keep migrations focused on single logical changes

## Example Migration

```sql
-- Migration: Create users table
-- Created at: 2024-01-23 12:00:00

BEGIN;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

COMMIT;
```

## Running Migrations

### Local Development

```bash
# Apply all pending migrations
supabase db push

# Reset database and reapply all migrations
supabase db reset
```

### Production

Migrations are typically applied automatically via:

- Supabase Dashboard (Migrations tab)
- CI/CD pipeline
- Manual application via Supabase CLI with production credentials

## Validation

Our pre-push hooks automatically validate migrations:

```bash
# Manually validate migrations
pnpm db:migrations-check

# Check SQL formatting
pnpm db:format-check

# Auto-format SQL files
pnpm db:format
```

## Resources

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Database Design](https://supabase.com/docs/guides/database/overview)
