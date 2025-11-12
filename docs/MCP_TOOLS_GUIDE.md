# MCP Tools Usage Guide

This guide shows you how to use the Model Context Protocol (MCP) tools available in your
project, specifically for Supabase and Playwright.

## Table of Contents

1. [Supabase MCP Tools](#supabase-mcp-tools)
2. [Playwright MCP Tools](#playwright-mcp-tools)
3. [Common Use Cases](#common-use-cases)
4. [Examples](#examples)

---

## Supabase MCP Tools

The Supabase MCP server gives you direct access to your Supabase projects through AI
assistants. Here are the available operations:

### Available Supabase MCP Functions

#### Project Management

- `list_projects()` - List all your Supabase projects
- `get_project(id)` - Get details about a specific project
- `get_project_url(id)` - Get the API URL for a project
- `get_anon_key(id)` - Get the anonymous API key

#### Database Operations

- `list_tables(project_id, schemas?)` - List all tables in your database
- `execute_sql(project_id, query)` - Execute raw SQL queries
- `apply_migration(project_id, name, query)` - Apply database migrations

#### Schema & Types

- `list_extensions(project_id)` - List installed PostgreSQL extensions
- `list_migrations(project_id)` - List all database migrations
- `generate_typescript_types(project_id)` - Generate TypeScript types from your schema

#### Edge Functions

- `list_edge_functions(project_id)` - List all Edge Functions
- `get_edge_function(project_id, function_slug)` - Get Edge Function code
- `deploy_edge_function(project_id, name, files)` - Deploy an Edge Function

#### Monitoring & Debugging

- `get_logs(project_id, service)` - Get logs for a service (api, postgres, auth, etc.)
- `get_advisors(project_id, type)` - Get security/performance recommendations

#### Branching (Development Branches)

- `list_branches(project_id)` - List development branches
- `create_branch(project_id, name)` - Create a new development branch
- `merge_branch(branch_id)` - Merge branch to production
- `reset_branch(branch_id)` - Reset branch migrations

---

## Examples

### Example 1: List Your Projects

**What it does:** Shows all your Supabase projects with their IDs and status.

**How to use:**

```
"List my Supabase projects"
"Show me all my Supabase projects"
"What Supabase projects do I have?"
```

**Result:**

- Project ID: `ufndmgxmlceuoapgvfco`
- Name: Genie-V3
- Status: ACTIVE_HEALTHY
- Region: us-east-1

---

### Example 2: List Database Tables

**What it does:** Shows all tables in your database schema.

**How to use:**

```
"List all tables in my Genie-V3 project"
"What tables are in my database?"
"Show me the database schema"
```

**Available tables in your project:**

- `contacts` - Contact information
- `funnel_projects` - Funnel project data
- `marketing_profiles` - Marketing profile data
- `user_profiles` - User profile information
- `payment_transactions` - Payment records
- And 40+ more tables...

---

### Example 3: Query Data from Tables

**What it does:** Execute SQL queries to fetch data from your database.

**How to use:**

```
"How many contacts do I have?"
"Show me the last 5 funnel projects"
"What users signed up this week?"
"Get all marketing profiles"
```

**Example queries:**

1. **Count records:**

```sql
SELECT COUNT(*) as total_contacts FROM contacts;
```

2. **Get recent records:**

```sql
SELECT id, name, created_at
FROM funnel_projects
ORDER BY created_at DESC
LIMIT 5;
```

3. **Filter and search:**

```sql
SELECT * FROM contacts
WHERE email LIKE '%@example.com'
ORDER BY created_at DESC;
```

4. **Join tables:**

```sql
SELECT
  fp.name as project_name,
  COUNT(c.id) as contact_count
FROM funnel_projects fp
LEFT JOIN contacts c ON c.project_id = fp.id
GROUP BY fp.id, fp.name;
```

---

### Example 4: Get Project Information

**What it does:** Get detailed information about a specific project.

**How to use:**

```
"Get details for project ufndmgxmlceuoapgvfco"
"Show me the Genie-V3 project info"
"What's the database version for my project?"
```

**Returns:**

- Project name and ID
- Database host and version
- Region and status
- Creation date

---

### Example 5: Generate TypeScript Types

**What it does:** Generate TypeScript type definitions from your database schema.

**How to use:**

```
"Generate TypeScript types for my Supabase project"
"Create types from my database schema"
```

**Result:** TypeScript interfaces matching your database tables, ready to use in your
code.

---

### Example 6: Check Database Logs

**What it does:** View logs from various Supabase services for debugging.

**How to use:**

```
"Show me the API logs for my project"
"Get postgres logs"
"Check auth service logs"
```

**Available services:**

- `api` - API request logs
- `postgres` - Database logs
- `auth` - Authentication logs
- `storage` - Storage logs
- `realtime` - Realtime logs
- `edge-function` - Edge Function logs

---

### Example 7: Get Security Recommendations

**What it does:** Get security and performance advisories for your database.

**How to use:**

```
"Check for security issues in my database"
"Show me performance recommendations"
"What security problems do I have?"
```

**Returns:**

- Missing RLS policies
- Performance issues
- Security vulnerabilities
- Best practice recommendations

---

### Example 8: Apply Database Migrations

**What it does:** Run SQL migrations to modify your database schema.

**How to use:**

```
"Create a new table called 'notifications'"
"Add a column 'status' to the contacts table"
"Apply this migration: [SQL here]"
```

**Example:**

```sql
-- Migration: add_status_to_contacts
ALTER TABLE contacts
ADD COLUMN status VARCHAR(50) DEFAULT 'active';
```

---

### Example 9: Work with Edge Functions

**What it does:** List, view, and deploy Supabase Edge Functions.

**How to use:**

```
"List my Edge Functions"
"Show me the code for function 'send-email'"
"Deploy a new Edge Function"
```

---

## Playwright MCP Tools

The Playwright MCP server allows you to automate browser interactions and testing.

### Available Playwright Functions

#### Navigation

- `navigate(url)` - Navigate to a webpage
- `screenshot(name)` - Take a screenshot
- `get_visible_text()` - Get page text content
- `get_visible_html()` - Get page HTML

#### Interactions

- `click(selector)` - Click an element
- `fill(selector, value)` - Fill an input field
- `select(selector, value)` - Select from dropdown
- `hover(selector)` - Hover over element
- `upload_file(selector, filePath)` - Upload a file

#### Testing & Debugging

- `evaluate(script)` - Run JavaScript in browser
- `console_logs()` - Get browser console logs
- `expect_response(id, url)` - Wait for HTTP response

#### Advanced

- `save_as_pdf()` - Save page as PDF
- `drag(sourceSelector, targetSelector)` - Drag and drop
- `press_key(key)` - Press keyboard key

---

## Common Use Cases

### Use Case 1: Database Analytics

**Scenario:** You want to understand your user growth.

**Commands:**

```
"Show me how many users signed up each month this year"
"Compare signups between this month and last month"
"What's the average time between signup and first purchase?"
```

### Use Case 2: Data Quality Checks

**Scenario:** You want to find data issues.

**Commands:**

```
"Find all contacts with invalid email addresses"
"Show me duplicate entries in the contacts table"
"List all records missing required fields"
```

### Use Case 3: Performance Monitoring

**Scenario:** You want to check database performance.

**Commands:**

```
"Show me slow queries from the postgres logs"
"Check API response times"
"Get error rates from the API logs"
```

### Use Case 4: Schema Exploration

**Scenario:** You want to understand your database structure.

**Commands:**

```
"Show me all columns in the contacts table"
"What foreign keys exist in my database?"
"List all indexes on the funnel_projects table"
```

---

## Tips for Using MCP Tools

1. **Be Specific:** Include the project ID when you have multiple projects
   - ✅ "Query the contacts table in project ufndmgxmlceuoapgvfco"
   - ❌ "Query contacts" (ambiguous if multiple projects)

2. **Use Natural Language:** The AI understands conversational queries
   - ✅ "How many funnel projects were created last week?"
   - ✅ "Show me the most recent 10 contacts"

3. **Ask for Help:** If you're not sure what's available
   - ✅ "What tables are in my database?"
   - ✅ "What MCP tools can I use?"

4. **Combine Operations:** You can chain multiple operations
   - ✅ "List my projects, then show me tables in the first one"
   - ✅ "Get the project details and then query the contacts table"

---

## Your Current Setup

**Project:** Genie-V3 **Project ID:** `ufndmgxmlceuoapgvfco` **Status:** ACTIVE_HEALTHY
**Region:** us-east-1 **Database:** PostgreSQL 17.6.1

**Available Tables:** 47 tables including:

- User management (user_profiles, user_settings)
- Funnel system (funnel_projects, funnel_flows, funnel_analytics)
- Marketing (marketing_profiles, marketing_content_calendar)
- Payments (payment_transactions, stripe_accounts)
- And many more...

---

## Next Steps

1. **Explore your data:** Try asking "Show me data from [table_name]"
2. **Check logs:** Ask "Show me recent API logs"
3. **Generate types:** Request "Generate TypeScript types for my database"
4. **Monitor security:** Ask "Check for security issues"

The MCP tools are now ready to use! Just ask naturally and the AI will use the
appropriate tools to help you.
