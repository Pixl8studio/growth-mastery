---
description: Create a new integration with adapter, tests, and documentation
---

# Add Integration Command

Build a new service integration for MCP Hubby.

## Arguments

`/add-integration <service-name>`

Example: `/add-integration notion` or `/add-integration slack`

## Mission

You're adding a new service integration. This is a **collaborative process**: you handle
the code (adapter, tests, pages, configuration), then guide the user through manual
setup (OAuth app creation, Nango configuration, testing).

Start by understanding the codebase through existing implementations. Then research the
target service. Finally, build an integration that fits naturally into the existing
architecture.

## Key Context

**Authentication Architecture:**

MCP Hubby supports **hybrid authentication** to optimize costs:

- **OAuth services** (Gmail, Slack, etc.) use Nango for OAuth flow management
- **API key services** (Limitless, Linear, etc.) use self-managed encrypted storage
- Service registry (`lib/services.ts`) defines auth method and metadata per service
- See `context/nango-cost-analysis.md` for cost optimization rationale

**For OAuth services:**

- Nango handles OAuth flow, token refresh, and proxied API calls
- Reference: `lib/adapters/gmail.ts`

**For API key services:**

- Users save API keys via `/api/connections/api-key`
- Credentials encrypted with AES-256 and stored in database
- Direct API calls (no Nango proxy needed)
- Reference: `lib/adapters/limitless.ts`

**SEO Strategy:**

- Integration pages are SEO-critical - they drive organic traffic
- Primary URL structure: `/integrations/[service]` (e.g., `/integrations/gmail`)
- Target keywords: "[Service] MCP server", "Connect [Service] to Claude"
- Later we'll add additional SEO pages that link back to the canonical integration page

**Centralized Service Registry:**

- ALL service metadata lives in `lib/services.ts` SERVICE_REGISTRY
- This is the single source of truth for service configuration
- No service metadata should be hardcoded elsewhere
- Components import helper functions (getServiceById, getAvailableServices, etc.)
- This prevents schema drift and ensures consistency across the app

**Reference Code:**

- Clone reference MCP servers to `../[service]-mcp-server` (one level up from project
  root)
- Study their operation choices and API usage patterns
- Note: We may take different architectural approaches (OAuth via Nango), but their
  operation design is valuable

---

## Discovery Process

### Understand Existing Patterns

Examine existing integrations to understand how the system works:

**Adapter Architecture:**

- Read `lib/adapters/gmail.ts` for OAuth services or `lib/adapters/limitless.ts` for API
  key services
- Understand:
  - Base class structure and required methods
  - How operations are defined and routed
  - Error handling patterns
  - Using `getCredentials()` from connection manager
  - OAuth: Nango proxy calls with connectionId
  - API keys: Direct HTTP calls with decrypted credentials

**Testing Approach:**

- Read `__tests__/lib/adapters/gmail.test.ts` (or newest) to understand:
  - Test structure and organization
  - Mocking patterns for database and HTTP calls
  - What scenarios to cover (happy path, errors, edge cases)
  - How to handle environment variable testing

**Integration Pages:**

- Read `app/integrations/gmail/page.tsx` (or newest) to understand:
  - SEO metadata structure
  - Page layout and sections
  - FAQ schema markup
  - How to structure example prompts and operations

**System Registration:**

- Add to `lib/services.ts` SERVICE_REGISTRY - define service metadata and auth method
- Register in `lib/gateway/router.ts` - add adapter instance
- For OAuth: Add to `app/api/connect/route.ts` enum and integration key map
- Check `app/hub/page.tsx` - how services are displayed with status
- Check `app/connect/[service]/page.tsx` - service name mappings

### Research the Target Service

**Find Existing MCP Servers:**

- Search GitHub: "[service] MCP server" or "model context protocol [service]"
- Clone promising implementations to `../[service]-mcp-server`
- Study what operations they expose - which are most useful for AI agents?
- Learn from their error handling and edge cases

**Study the Official API:**

- Read the service's API documentation
- Understand authentication requirements
- Identify rate limits and constraints
- Learn common use cases and workflows

**Determine Authentication Method:**

**For OAuth services:**

- Search Nango's integration library for the service
- Understand OAuth scopes required
- Note any service-specific configuration (API versions, headers, etc.)

**For API key services:**

- Check if service provides API keys or bearer tokens
- Understand API authentication headers
- Check for additional required headers (API version, content type, etc.)
- Verify API key can be tested without OAuth complexity

---

## What to Build

Build these components, following patterns you discovered:

### Service Registry (`lib/services.ts`)

**Add service to SERVICE_REGISTRY array:**

```typescript
{
    id: "limitless",
    name: "Limitless",
    description: "AI wearable notes and recordings",
    icon: "🎙️",
    logo: "/limitless-logo.svg",
    authMethod: "api_key", // or "oauth"
    status: "in_testing", // Start as "in_testing", change to "available" after user testing
    nangoIntegrationKey: "limitless", // only for OAuth services
    getApiKeyUrl: "https://my.limitless.ai/settings/api-keys", // only for API key services
}
```

### Service Adapter (`lib/adapters/[service].ts`)

Create an adapter that extends the base class with:

**Required Properties:**

- Service name (lowercase, matches service config)
- Display name (human-readable)

**Required Methods:**

- `getHelp()` - Document all available operations
- `execute()` - Route operations to handlers
- `executeRawAPI()` - Escape hatch for direct API access
- `fetchAccountInfo()` - Only for OAuth services (optional for API keys)

**BEFORE WRITING ADAPTER CODE:**

⚠️ **Important First Step:** Determine the correct Nango proxy URL pattern!

1. Find the service's API documentation
2. Look at their base URL (e.g., `https://api.service.com`)
3. Look at example endpoints (e.g., `/v1/users`, `/api/0/organizations`)
4. Extract the path after the domain: `/v1/...` or `/api/0/...` or `/api/v2/...`
5. Your Nango URLs will be: `${nangoUrl}/proxy/[that-exact-path]`

See "Nango Proxy URL Construction" section below for detailed examples. Getting this
wrong causes "HTML instead of JSON" errors that are hard to debug!

**Getting Credentials:**

```typescript
// Use connection manager (works for both auth types)
const connectionCreds = await getCredentials(userEmail, this.serviceName);

// For OAuth services
if (connectionCreds.type === "oauth") {
  const connectionId = connectionCreds.connectionId;
  // Make Nango proxy calls
}

// For API key services
if (connectionCreds.type === "api_key") {
  const apiKey = connectionCreds.credentials.apiKey;
  // Make direct HTTP calls
}
```

**Operations to Implement:**

- Based on your research, choose 4-12 core operations
- Focus on what AI agents would actually use
- Include search/list, read, create/update operations
- Consider the service's primary use cases

**Error Handling:**

- For OAuth: Validate NANGO_SECRET_KEY configuration
- For API keys: No env vars needed (encrypted in DB)
- Validate user connection exists via connection manager
- Parse HTTP errors into user-friendly messages
- **Capture errors to Sentry**: Use
  `this.captureError(error, { action, params, userEmail })` in catch blocks to ensure
  errors are tracked for monitoring and alerting
- Add comprehensive logging (use emoji prefixes for easy scanning)

### Service Examples Configuration (`lib/config/service-examples.ts`)

Add 5 example prompts for your service to the shared `SERVICE_EXAMPLES` configuration:

**Purpose:**

- Powers the rotating tips UI on the home/connect pages
- Generates MCP prompt templates shown to AI clients during initialization
- Single source of truth for all service usage examples

**Structure:**

Each example needs four properties:

```typescript
{
  icon: string; // Emoji representing the action (e.g., "📧", "🔍")
  text: string; // UI-friendly description shown in rotating tips
  description: string; // Short description for MCP prompt list
  prompt: string; // Full prompt text for MCP prompt execution
}
```

**Guidelines:**

- Create 5 diverse examples covering core operations
- Focus on real-world use cases AI agents would handle
- Make prompts specific and actionable
- Use conversational language ("Ask Claude to...", "Have your AI...")
- Examples should demonstrate different operation types (search, create, update, read)

**Example:**

```typescript
gmail: [
    {
        icon: "💡",
        text: "Ask Claude to summarize all unread emails from the past week",
        description: "Summarize all unread emails from the past week",
        prompt: "Summarize all my unread emails from the past week. Group them by sender and highlight any urgent messages that need my immediate attention.",
    },
    // ... 4 more examples
],
```

**Where It's Used:**

- `components/features/rotating-tips.tsx` - Shows examples on connection pages
- `lib/gateway/prompts.ts` - Generates MCP prompts as `{serviceId}_example_{index}`
- `app/mcp/route.ts` - Returns one random prompt per connected service in `prompts/list`

### Comprehensive Tests (`__tests__/lib/adapters/[service].test.ts`)

Write tests covering:

- Configuration validation
- All operations (happy path)
- Error scenarios (missing connection, API errors)
- Parameter validation
- Edge cases (empty results, malformed data)

Run tests with: `pnpm test __tests__/lib/adapters/[service].test.ts`

### SEO-Optimized Integration Page (`app/integrations/[service]/page.tsx`)

Create a landing page with:

- SEO metadata (title, description, keywords, OpenGraph)
- FAQ schema markup for search engines
- Hero section with service logo and CTA
- "What You Can Do" section with example prompts
- "How to Connect" step-by-step guide
- "Available Operations" organized by category
- FAQ section answering common questions
- Final CTA section

### Service Logo (`public/[service]-logo.svg`)

**IMPORTANT: Get a SQUARE ICON without text**

The logo must be:

- **Square aspect ratio** (viewBox should be square like "0 0 64 64" or "0 0 32 32")
- **Icon/mark only** - NO text, NO company name, NO tagline
- **Official brand colors** - should match the service's brand identity
- **SVG format** - vector graphics that scale perfectly

**How to Get a High-Quality Official Icon:**

1. **VectorLogoZone (BEST for square icons):**
   - Visit https://www.vectorlogo.zone/logos/[service]/index.html
   - Look for the **"Icon"** row in the table (NOT "Rectangle" or "Tile")
   - Download the `-icon.svg` file
   - Example: https://www.vectorlogo.zone/logos/giphy/giphy-icon.svg
   - This source specifically provides square icons without text

2. **Try the service's official website:**
   - Visit the service's homepage (e.g., `https://fireflies.ai`)
   - Check the footer for "Media Kit", "Press Kit", or "Brand Assets" links
   - Look specifically for "icon" or "app icon" assets, NOT the full logo
   - Example: Fireflies.ai has a Google Drive media kit linked in their footer

3. **Use Brandfetch (reliable for brand assets):**
   - Visit https://brandfetch.com/[service-name]
   - Example: https://brandfetch.com/fireflies.ai
   - Look for "Symbol" or "Icon" variants, NOT the full logo
   - Avoid any assets that include the company name

4. **Check Wikipedia/Wikimedia Commons (for well-known companies):**
   - Search for "[Service] icon" or "[Service] logo" on Wikipedia
   - Look for square icon variants
   - Example: Google Calendar icon from Wikimedia Commons

5. **Logo resource sites (use as fallback):**
   - SeekLogo: https://seeklogo.com
   - SVG Repo: https://www.svgrepo.com
   - Search for "[service] icon svg" specifically
   - Verify these are official icons, not recreations

**Download Process:**

```bash
# Method 1: Direct download from service website
curl -L "https://[service].com/path/to/logo.svg" -o public/[service]-logo.svg

# Method 2: From Wikimedia Commons
curl -L "https://upload.wikimedia.org/wikipedia/commons/[path]/[file].svg" -o public/[service]-logo.svg

# Method 3: If the above gets HTML instead of SVG, inspect the service's website
# and find the logo image URL, then download directly
```

**Quality Requirements:**

- **CRITICAL:** Must be a SQUARE ICON without any text
  - Verify viewBox is square (e.g., "0 0 64 64", NOT "0 0 256 193")
  - Should contain ONLY the brand mark/symbol, NO company name
  - Use VectorLogoZone's "-icon.svg" file when available
- **IMPORTANT:** Name must follow pattern: `/{service-id}-logo.svg` (e.g.,
  `/gmail-logo.svg`)
- Must be official brand icon (not a generic recreation)
- SVG format (vector graphics scale perfectly)
- Keep file size under 50KB for performance
- Should include proper brand colors (not generic/placeholder colors)
- Test will verify logo exists and is valid:
  `pnpm test __tests__/lib/services-logo.test.ts`

**Common Pitfalls:**

- **Using rectangular logos with text** - Always get the square icon variant
- **Using the full logo instead of the icon** - Icons are cleaner and more recognizable
- CDN links from Brandfetch sometimes return HTML instead of SVG - verify with `file`
  command
- Generic/placeholder icons hurt brand recognition - always use official assets
- Missing gradients or wrong colors indicate low-quality reproductions
- Non-square aspect ratios look distorted in the UI - always verify viewBox is square

### System Registration

Update these files to register the new service:

- `lib/services.ts` - Add service to SERVICE_REGISTRY array (ALREADY DONE in step 1)
- `lib/gateway/router.ts` - Add adapter instance to registerAdapters()
- `app/api/connect/route.ts` - Add service to enum and integration key map (OAuth only
  for now)
- `app/hub/page.tsx` - Service appears automatically via service registry
- `app/connect/[service]/page.tsx` - Add service name mapping if needed
- `lib/config/service-examples.ts` - Add 5 example prompts (see Service Examples
  Configuration section)
- Run logo verification test: `pnpm test __tests__/lib/services-logo.test.ts`

### OAuth Route Synchronization (OAuth services only)

The OAuth flow uses two endpoints: `/api/connect` creates the session when the user
clicks "Connect", and `/api/connect/save` stores the connection after authorization
completes. Both routes validate the service name using Zod enums around line 17 in each
file, and these enums need to stay synchronized.

When you add a new integration, update the service enum in both
`app/api/connect/route.ts` and `app/api/connect/save/route.ts`. Add your service name to
the existing array, like `"gmail"`, `"google-calendar"`, `"notion"`.

If the service is missing from the save endpoint, OAuth will complete successfully but
fail when trying to persist the connection. The user gets redirected back to the app, so
the error is easy to miss—check Render logs for 400 errors on `/api/connect/save` when
testing the full flow.

There's a test in `__tests__/app/api/schema-consistency.test.ts` that documents where
these schemas live and validates service naming conventions. Eventually this should be
refactored to use a shared constant so the compiler enforces synchronization.

---

## Quality Checks & Workflow

### Run Quality Checks

Before committing, verify:

- **URL Pattern Verification** - Compare your Nango proxy URLs with the service's real
  API documentation
  - [ ] Confirmed API base URL from official docs
  - [ ] Verified path prefix (e.g., `/api/0/`, `/v1/`, `/api/v2/`)
  - [ ] Tested one operation to ensure JSON response (not HTML)
  - [ ] All endpoints use consistent path pattern
- `pnpm lint` - No errors in project code
- `pnpm format:check` - Formatting is correct (or run `pnpm format`)
- `pnpm type-check` - No TypeScript errors
- `pnpm test __tests__/lib/adapters/[service].test.ts` - Adapter tests passing
- `pnpm test __tests__/lib/services-logo.test.ts` - Logo verification passing
- `pnpm build` - Build completes successfully

### Git Workflow

1. Create feature branch: `git checkout -b feature/[service]-integration`
2. Commit your changes with descriptive messages (use gitmoji convention)
3. Push branch: `git push -u origin feature/[service]-integration`
4. Create PR: `gh pr create` with comprehensive description
5. Monitor CI checks and address any failures
6. Wait for user to review and merge

---

## Post-Implementation: User Manual Steps

After your code is complete, provide the user with these manual setup instructions:

---

## For OAuth Services

### Create OAuth Application

**Where to create:**

- Notion: https://www.notion.so/profile/integrations
- Google Services: https://console.cloud.google.com/apis/credentials
- GitHub: https://github.com/settings/developers
- Slack: https://api.slack.com/apps
- (Find the appropriate portal for the service)

**Configuration:**

- App name: "MCP Hubby" (or user's preferred name)
- Redirect URI: `https://api.nango.dev/oauth/callback` ⚠️ Must match exactly
- Scopes: (List the specific permissions needed)

**Output:** Client ID and Client Secret (keep secure, never commit)

### Configure Nango Integration

**Steps:**

1. Log into Nango dashboard: https://app.nango.dev
2. **Important:** Select the correct environment (Development or Production)
3. Navigate to "Integrations" → "Add Integration"
4. Select the service from provider list
5. Configure:
   - Integration ID: `[service]` (must match `nangoIntegrationKey` in service config)
   - Client ID and Secret from OAuth app
   - Scopes (auto-filled for known services)
6. Save and test OAuth flow in Nango dashboard

**Common pitfall:** Setting up integration in wrong Nango environment (prod vs dev)

### End-to-End Testing

**Test OAuth Flow:**

1. Visit integration page (e.g., `/integrations/gmail`)
2. Click "Connect [Service]" button
3. Complete OAuth authorization
4. Verify redirect back to app
5. Check connection appears in hub

**Test MCP Operations:**

1. Configure MCP client (Claude Desktop, Cursor, etc.)
2. Verify service appears as connected
3. Test operations via MCP client
4. Verify error handling with invalid inputs

---

## For API Key Services

### Get API Key from Service

**Steps:**

1. Log into the service's dashboard
2. Navigate to Settings → API Keys (or similar)
3. Generate new API key
4. Copy the key (keep secure, never commit)

### Connect via MCP Hubby

**Steps:**

1. Visit integration page (e.g., `/integrations/limitless`)
2. Click "Connect [Service]" button
3. Paste API key in the form
4. Submit to save (credentials are encrypted automatically)
5. Verify connection appears in hub

### End-to-End Testing

**Test MCP Operations:**

1. Configure MCP client (Claude Desktop, Cursor, etc.)
2. Verify service appears as connected
3. Test operations via MCP client (search, list, etc.)
4. Verify error handling (invalid API key shows helpful message)

**Note:** API key services skip OAuth flow entirely. Users provide the key directly, we
encrypt it, and adapters make direct HTTP calls.

---

## Common Pitfalls & Solutions

### Reference Code Location

Clone reference MCP servers to `../[service]-mcp-server` (one level up from project
root), not inside the project. This avoids lint/type/test errors from external code.

### Environment Configuration in Tests

When testing missing environment variables, use `vi.resetModules()` to properly reload
modules with new env state.

### Nango Proxy Headers

All Nango proxy calls need three headers:

- `Authorization: Bearer ${nangoSecretKey}` (your secret, not user token)
- `Connection-Id: ${connectionId}` (from database)
- `Provider-Config-Key: [service]` (must match Nango integration ID)

Plus any service-specific headers (e.g., API version).

### Nango Proxy URL Construction

The Nango proxy URL format must match the service's actual API endpoint path. Getting
this wrong causes "HTML instead of JSON" errors because you hit the wrong endpoint.

**The Golden Rule:**

```
Nango Proxy URL = https://api.nango.dev/proxy/{everything-after-the-domain}
```

Where `{everything-after-the-domain}` is the **exact path** from the service's real API
URL, starting with the first `/`.

**Step-by-Step Process:**

1. **Find the service's API base URL** in their documentation
2. **Look at an example endpoint** (e.g., "Get User Info")
3. **Extract everything after the domain name**
4. **Prepend `/proxy/` to that path**

**Visual Examples:**

| Service    | Real API URL                                             | Extract Path After Domain | Nango Proxy URL                               |
| ---------- | -------------------------------------------------------- | ------------------------- | --------------------------------------------- |
| Gmail      | `https://gmail.googleapis.com/gmail/v1/users/me/profile` | `/gmail/v1/users/me/...`  | `${nangoUrl}/proxy/gmail/v1/users/me/profile` |
| Dropbox    | `https://api.dropboxapi.com/2/files/list_folder`         | `/2/files/list_folder`    | `${nangoUrl}/proxy/2/files/list_folder`       |
| Notion     | `https://api.notion.com/v1/pages`                        | `/v1/pages`               | `${nangoUrl}/proxy/v1/pages`                  |
| Slack      | `https://slack.com/api/users.list`                       | `/api/users.list`         | `${nangoUrl}/proxy/api/users.list`            |
| ClickUp    | `https://api.clickup.com/api/v2/team`                    | `/api/v2/team`            | `${nangoUrl}/proxy/api/v2/team`               |
| **Sentry** | `https://sentry.io/api/0/organizations/`                 | `/api/0/organizations/`   | `${nangoUrl}/proxy/api/0/organizations/`      |

**Common Mistakes to Avoid:**

❌ **WRONG:** Adding the service name when it's not in the real API

```typescript
// Sentry's real API: https://sentry.io/api/0/...
.get(`${nangoUrl}/proxy/organizations/`)  // ❌ Missing /api/0/
.get(`${nangoUrl}/proxy/sentry/api/0/...`)  // ❌ Added service name
```

✅ **CORRECT:** Copy the exact path from the real API

```typescript
// Sentry's real API: https://sentry.io/api/0/...
.get(`${nangoUrl}/proxy/api/0/organizations/`)  // ✅ Matches real API
```

**Why This Matters:**

- The service is identified by the `Provider-Config-Key` header, NOT the URL path
- The Nango proxy forwards the path to the actual API, so it must match exactly
- Wrong paths return HTML error pages instead of JSON (confusing error messages!)

**Verification Checklist:**

Before writing any adapter code:

- [ ] Found the service's official API documentation
- [ ] Identified the API base URL (e.g., `https://api.service.com`)
- [ ] Looked at 3-5 example endpoints in the docs
- [ ] Verified the common path prefix (e.g., `/api/v2/`, `/v1/`, `/api/0/`)
- [ ] Compared with working adapters (Gmail, ClickUp, Dropbox)
- [ ] Wrote down the proxy URL pattern for this service

**Testing Your URLs:**

After implementing the adapter, test ONE operation first:

```typescript
// Test the simplest read operation (usually "get current user" or "list items")
const response = await httpClient.get(`${nangoUrl}/proxy/[YOUR_PATH]`, {
  headers: {
    Authorization: `Bearer ${nangoSecretKey}`,
    "Connection-Id": connectionId,
    "Provider-Config-Key": "[service]",
  },
});
```

If you get:

- ✅ JSON response → URLs are correct!
- ❌ HTML response (e.g., "<!doctype...") → Wrong path, go back to API docs
- ❌ 404 error → Path doesn't exist in the real API
- ❌ 401 error → Auth issue (check Provider-Config-Key and connectionId)

### Error Logging Best Practices

- Log at each major step with emoji prefixes (📥, ✅, ❌, ⚠️, 📦, 🔧, 🔑, 🚀)
- Use `JSON.stringify(errorData, null, 2)` for nested objects - console.log truncates
  arrays
- Return user-friendly error messages, not raw objects (avoid "[object Object]")
- For API errors, log the response body - it tells you WHY it failed

### OAuth Redirect Mismatch

Redirect URI in service OAuth app must be EXACTLY
`https://api.nango.dev/oauth/callback` - no trailing slash, no variations.

### Nango Environment Mismatch

Integration must be configured in the Nango environment that matches where you're
testing (Development for local, Production for live). Easy to miss!

---

## Completion Checklist

Before reporting to the user:

- [ ] All code committed to feature branch
- [ ] All quality checks passing
- [ ] PR created and CI checks passing
- [ ] Clear manual setup instructions provided
- [ ] User knows next steps

**Report to user:**

```
✅ [Service] Integration Code Complete!

**What was built:**
- [Service]Adapter with [N] operations ([list key ones])
- [N] comprehensive tests (all passing)
- SEO-optimized integration page at /integrations/[service]
- System registration complete

**Your next steps:**
1. Create [Service] OAuth app (instructions above)
2. Configure Nango integration in correct environment (dev/prod)
3. Test end-to-end flow
4. Merge PR when ready

Let me know if you hit any issues during setup! 🎨
```
