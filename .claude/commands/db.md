# Database Operations

Execute database operations on the GrowthMastery.ai Supabase project.

## Arguments

$ARGUMENTS - The operation to perform. Options:
- `query <sql>` - Execute a SQL query
- `tables` - List all tables in the database
- `schema <table>` - Show schema for a specific table
- `migrate <description>` - Create and run a new migration
- `info` - Show project connection info
- `add-column <table> <column> <type>` - Add a column to a table

## Instructions

Read the Supabase access instructions from `.claude/docs/supabase-database-access.md`.

### For `query` operations:

1. Execute the SQL using: `pnpm db:query "<sql>"`
2. Display the results to the user
3. If the query fails, explain the error and suggest corrections

### For `tables` operations:

1. Run: `pnpm db:tables`
2. Display the table list with column counts

### For `schema` operations:

1. Run: `pnpm db:schema <table_name>`
2. Display the column details

### For `migrate` operations:

1. Generate a timestamp: `date +%Y%m%d%H%M%S`
2. Create migration file at: `supabase/migrations/TIMESTAMP_description.sql`
3. Write the migration SQL with proper BEGIN/COMMIT transaction wrapper
4. Ask user to confirm before running
5. Run: `pnpm db:migrate supabase/migrations/TIMESTAMP_description.sql`
6. Report success or failure

### For `add-column` operations:

1. Generate migration SQL:
   ```sql
   BEGIN;
   ALTER TABLE public.<table>
   ADD COLUMN IF NOT EXISTS <column> <type>;
   COMMIT;
   ```
2. Create migration file with appropriate name
3. Run the migration
4. Update `types/database.ts` if the TypeScript types need updating

### For `info` operations:

1. Run: `pnpm db:info`
2. Display the project details

## Safety Checks

Before running any DDL (CREATE, ALTER, DROP):

1. Confirm the operation with the user
2. For DROP operations, require explicit confirmation
3. Always use IF EXISTS / IF NOT EXISTS for idempotency
4. Wrap in transactions (BEGIN/COMMIT)

## Example Usage

```
/db query SELECT * FROM user_profiles LIMIT 5
/db tables
/db schema funnel_projects
/db add-column user_profiles last_login TIMESTAMPTZ
/db migrate add_analytics_events_table
```
