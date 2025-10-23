# Supabase Tooling Setup Complete

This document describes the comprehensive Supabase validation and tooling setup
implemented in genie-v3, which mirrors the Prisma setup from mcp-hubby.

## 🎯 Overview

We've implemented **Supabase equivalents** for all Prisma validation checks that Nick's
mcp-hubby project uses, ensuring the same level of database validation and quality
control.

## 📦 What Was Added

### 1. Dependencies

```json
{
  "devDependencies": {
    "sql-formatter": "^15.6.10", // SQL formatting & validation
    "supabase": "^2.53.6" // Supabase CLI
  }
}
```

### 2. Package Scripts

| Script                     | Purpose                                        | Equivalent To (mcp-hubby)   |
| -------------------------- | ---------------------------------------------- | --------------------------- |
| `pnpm db:types`            | Generate TypeScript types from Supabase schema | `pnpm db:generate` (Prisma) |
| `pnpm db:types:remote`     | Generate types from remote Supabase project    | N/A                         |
| `pnpm db:validate`         | Validate Supabase configuration & connection   | `pnpm prisma:validate`      |
| `pnpm db:migrations-check` | Validate migration files are well-formed       | Prisma schema validation    |
| `pnpm db:format`           | Auto-format SQL migration files                | `pnpm prisma:format`        |
| `pnpm db:format-check`     | Check SQL migration formatting                 | `pnpm prisma:format-check`  |

### 3. Validation Scripts

#### `scripts/validate-supabase.ts`

Validates:

- ✅ Environment variables are set correctly
- ✅ Database types exist and are up-to-date
- ✅ Supabase directory structure is present
- ✅ Connection can be established (if credentials provided)

**Exit Codes:**

- `0` - Validation passed (with optional warnings)
- `1` - Validation failed with errors

#### `scripts/check-migrations.ts`

Validates:

- ✅ Migration files follow naming convention (`YYYYMMDDHHMMSS_description.sql`)
- ✅ SQL syntax is well-formed
- ✅ No duplicate migration timestamps
- ⚠️ Warns about missing transactions
- ❌ Fails on dangerous operations (e.g., `DROP DATABASE`)

**Exit Codes:**

- `0` - All migrations are valid
- `1` - Migration validation failed

### 4. Directory Structure

```
supabase/
├── .gitignore              # Ignores local dev files
├── config.toml             # Supabase local development config
├── migrations/             # Database migration SQL files
│   └── README.md          # Migration guidelines
└── seed.sql               # Seed data for development
```

### 5. Pre-Push Hooks

**Updated `pre-push:checks`** to include:

```bash
run-p lint format:check type-check db:validate db:migrations-check
```

**What This Does:**

- ✅ Runs **5 checks in parallel** before every push
- ✅ Validates linting, formatting, types, database, and migrations
- ✅ Fails the push if any check fails
- ✅ Same comprehensive validation as mcp-hubby

### 6. GitHub Actions Workflow

**Updated `.github/workflows/build.yml`** with Supabase validation:

#### Quality Job (added steps):

```yaml
- name: 🗄️ Validate Supabase configuration
  run: pnpm db:validate

- name: ✅ Check migration files
  run: pnpm db:migrations-check

- name: ✨ Check SQL formatting
  run: pnpm db:format-check
```

#### Test & Build Jobs:

- Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment
  variables
- Uses placeholder values for CI/CD builds
- Real values come from GitHub Secrets in production

### 7. lint-staged Configuration

```json
{
  "supabase/migrations/*.sql": ["sql-formatter --language postgresql --output"]
}
```

**What This Does:**

- ✅ Auto-formats SQL files before every commit
- ✅ Ensures consistent SQL style across the team
- ✅ Same pattern as Prisma's `prisma format` in mcp-hubby

## 🔍 How It Compares to mcp-hubby

### Side-by-Side Comparison

| Check                 | mcp-hubby (Prisma)         | genie-v3 (Supabase)       | Status        |
| --------------------- | -------------------------- | ------------------------- | ------------- |
| **Type Generation**   | `pnpm db:generate`         | `pnpm db:types`           | ✅ Equivalent |
| **Schema Validation** | `pnpm prisma:validate`     | `pnpm db:validate`        | ✅ Equivalent |
| **Format Check**      | `pnpm prisma:format-check` | `pnpm db:format-check`    | ✅ Equivalent |
| **Auto Format**       | `pnpm prisma:format`       | `pnpm db:format`          | ✅ Equivalent |
| **Pre-push Hooks**    | ✅ Comprehensive           | ✅ Comprehensive          | ✅ Identical  |
| **GitHub Actions**    | ✅ 3 jobs with validation  | ✅ 3 jobs with validation | ✅ Identical  |
| **lint-staged**       | ✅ Prisma format           | ✅ SQL format             | ✅ Equivalent |

## 🚀 Usage

### Local Development

#### Generate Types

```bash
# From local Supabase instance
pnpm db:types

# From remote Supabase project
SUPABASE_PROJECT_ID=your-project-id pnpm db:types:remote
```

#### Validate Everything

```bash
pnpm db:validate           # Validate Supabase config
pnpm db:migrations-check   # Validate migration files
pnpm db:format-check       # Check SQL formatting
```

#### Format SQL Files

```bash
pnpm db:format             # Auto-format all SQL migrations
```

#### Pre-Push Checks

```bash
pnpm pre-push:checks       # Run all quality checks
pnpm pre-push              # Run checks + tests (full pre-push)
```

### Creating Migrations

#### Using Supabase CLI

```bash
supabase migration new your_migration_name
```

#### Manually

Create file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

Example: `supabase/migrations/20240123120000_create_users.sql`

### Best Practices

1. **Always use transactions** in migrations

   ```sql
   BEGIN;
   -- Your changes here
   COMMIT;
   ```

2. **Be explicit** with `IF EXISTS` / `IF NOT EXISTS`

   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   DROP TABLE IF EXISTS old_table;
   ```

3. **Test locally** before pushing

   ```bash
   pnpm db:validate
   pnpm db:migrations-check
   ```

4. **Format SQL** before committing
   ```bash
   pnpm db:format
   ```

## 🤖 CI/CD Integration

### GitHub Actions

The workflow runs on:

- Pull requests to `main`
- Pushes to `main`
- Manual workflow dispatch

**Jobs:**

1. **Quality** - Linting, formatting, type checking, Supabase validation
2. **Test** - Test suite with coverage
3. **Build** - Production build verification

### Environment Variables

Set these in GitHub Secrets:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Note:** The workflow uses placeholder values if secrets aren't set, allowing builds to
pass during initial setup.

## 🎓 Educational Notes

### Why These Checks Matter

1. **Type Generation (`db:types`)**
   - Keeps TypeScript types synchronized with database schema
   - Catches breaking changes at compile time
   - Prevents runtime errors from schema mismatches

2. **Validation (`db:validate`)**
   - Ensures configuration is correct
   - Validates environment variables
   - Tests database connectivity
   - Fails fast if setup is broken

3. **Migration Checks (`db:migrations-check`)**
   - Validates SQL syntax before execution
   - Prevents deployment of broken migrations
   - Enforces naming conventions
   - Catches dangerous operations

4. **SQL Formatting (`db:format-check`)**
   - Maintains consistent SQL style
   - Makes code reviews easier
   - Reduces merge conflicts
   - Improves readability

### Comparison to Prisma

| Feature               | Prisma                        | Supabase                       |
| --------------------- | ----------------------------- | ------------------------------ |
| **Schema Definition** | `schema.prisma` file          | SQL migrations                 |
| **Type Generation**   | Automatic from schema         | From database introspection    |
| **Migrations**        | Generated from schema changes | Hand-written SQL               |
| **Validation**        | Schema syntax validation      | Connection + config validation |
| **Benefits**          | Type-safe queries, migrations | Full SQL power, flexibility    |

## 📊 Testing & Verification

### Manual Testing

```bash
# Test validation
pnpm db:validate

# Test migration checking (should pass with warnings - no migrations yet)
pnpm db:migrations-check

# Test format checking (should pass - no SQL files yet)
pnpm db:format-check

# Run all pre-push checks
pnpm pre-push:checks

# Full pre-push (includes tests)
pnpm pre-push
```

### Expected Output

#### Successful Validation

```
✅ Supabase validation passed (with warnings).
✅ Migration validation passed (with warnings).
⚠️  No migration files to check
```

#### Warnings Are Normal

- Missing environment variables (okay for CI/CD)
- No migration files (okay for new projects)
- Types file is old (reminder to regenerate)

## 🔧 Troubleshooting

### "Types file not found"

```bash
pnpm db:types
```

### "Environment variables not set"

```bash
# Create .env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### "Migration validation failed"

Check your SQL syntax in `supabase/migrations/*.sql`

### "Pre-push checks failed"

Run individual checks to identify the issue:

```bash
pnpm lint              # Check linting
pnpm format:check      # Check formatting
pnpm type-check        # Check TypeScript
pnpm db:validate       # Check Supabase config
pnpm db:migrations-check  # Check migrations
```

## ✅ Verification Checklist

- [x] Dependencies installed (`sql-formatter`, `supabase`)
- [x] Validation scripts created and working
- [x] Package.json scripts added
- [x] Supabase directory structure created
- [x] Pre-push hooks include Supabase checks
- [x] GitHub Actions workflow updated
- [x] lint-staged includes SQL formatting
- [x] All checks pass successfully
- [x] Documentation complete

## 🎉 Result

Your genie-v3 project now has **identical database validation tooling** to Nick's
mcp-hubby project, but tailored for Supabase instead of Prisma. Every pre-push and CI/CD
run validates:

1. ✅ Code quality (lint, format, types)
2. ✅ Database configuration
3. ✅ Migration files
4. ✅ SQL formatting
5. ✅ Test coverage
6. ✅ Production build

**Elementary! The case is solved.** 🔍
