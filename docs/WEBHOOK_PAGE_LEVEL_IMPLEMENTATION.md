# Page-Level Webhook Implementation

**Status:** ✅ Complete **Date:** October 30, 2025 **Issue:**
[#69](https://github.com/danlawless/genie-v3/issues/69)

## Overview

Moved webhook configuration from global-only settings to support both global and
page-level webhooks. Pages can now have their own custom webhook URLs, or inherit from
the global default.

## Changes Made

### 1. Database Migration

**File:** `supabase/migrations/20251030201952_add_page_webhooks.sql`

Added webhook configuration columns to all three page types:

- `registration_pages`
- `enrollment_pages`
- `watch_pages`

**New columns:**

- `webhook_enabled` (BOOLEAN, nullable) - NULL means inherit from global
- `webhook_url` (TEXT) - Page-specific webhook URL
- `webhook_secret` (TEXT) - Page-specific HMAC secret
- `webhook_inherit_global` (BOOLEAN, default true) - Whether to use global settings

### 2. Type Definitions

**File:** `types/pages.ts`

Added interfaces for webhook configuration:

- `PageWebhookConfig` - Page-level webhook settings
- `EffectiveWebhookConfig` - Computed webhook config (with inheritance)
- Updated `PageListItem` to include webhook fields

### 3. Webhook Service Refactor

**File:** `lib/webhook-service.ts`

**New function:** `getWebhookConfig(userId, pageId?, pageType?)`

- Returns effective webhook configuration
- Checks page-level settings first
- Falls back to global if `webhook_inherit_global` is true
- Handles all three page types (registration, enrollment, watch)

**Updated function:** `sendWebhook(userId, payload, options?)`

- Now accepts optional `pageId` and `pageType` parameters
- Uses `getWebhookConfig()` to determine which webhook to use
- Maintains backward compatibility (works without page context)

### 4. API Updates

**File:** `app/api/contacts/route.ts`

- Updated to pass `pageId` and `pageType: "registration"` to webhook calls

**File:** `app/api/analytics/track/route.ts`

- Updated video watched webhook to include `pageType: "watch"`
- Updated enrollment viewed webhook to include `pageType: "enrollment"`

**New file:** `app/api/pages/[pageId]/webhook/route.ts`

- **GET** - Retrieve page webhook settings with effective config
- **PUT** - Update page webhook settings
- **POST** - Test page-specific webhook

### 5. Frontend Components

**New file:** `components/pages/page-webhook-settings.tsx`

Reusable component for configuring page-level webhooks:

- Toggle to inherit from global or use custom webhook
- Enable/disable webhook for the page
- Configure custom webhook URL and secret
- Test webhook functionality
- Shows effective configuration (inherited vs custom)
- Tracks unsaved changes

**Updated file:** `app/settings/integrations/page.tsx`

- Changed heading from "CRM Webhook" to "Global Webhook Settings"
- Added informational box explaining page-level webhooks
- Added explanation that pages can override global settings

### 6. Documentation

**Updated file:** `docs/webhooks.md`

Added comprehensive documentation:

- Explanation of global vs page-level webhooks
- Setup instructions for both levels
- Inheritance behavior documentation
- Use cases for page-level webhooks

### 7. Tests

**New file:** `__tests__/unit/lib/webhook-config.test.ts`

Unit tests for webhook configuration logic:

- ✅ Returns global config when no page context
- ✅ Returns page-specific config when page overrides global
- ✅ Inherits global config when page has `inherit_global` enabled
- ✅ Uses correct table name for different page types

## How It Works

### Inheritance Logic

1. If `pageId` and `pageType` are provided, look up page-level config
2. If page has `webhook_inherit_global: true` or `webhook_enabled: null`, use global
3. Otherwise, use page-specific webhook settings
4. If no page context provided, always use global

### Migration Strategy

**Backward Compatibility:** ✅ Fully maintained

- All existing pages default to `webhook_inherit_global: true`
- Global webhooks continue working exactly as before
- No action required from existing users
- Pages can be migrated to custom webhooks incrementally

### Effective Configuration

The system computes the "effective" webhook configuration that includes:

- `enabled` - Whether webhook is active
- `url` - The webhook URL being used
- `secret` - The webhook secret being used
- `isInherited` - Whether using global (true) or page-specific (false)

This is returned by:

- `getWebhookConfig()` function
- GET `/api/pages/[pageId]/webhook` endpoint
- Displayed in the UI component

## Usage Examples

### Configure Page-Level Webhook

```typescript
// Update page webhook settings
const response = await fetch(`/api/pages/${pageId}/webhook`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pageType: "registration",
    webhook_enabled: true,
    webhook_url: "https://crm.example.com/page-specific",
    webhook_secret: "page-secret",
    webhook_inherit_global: false,
  }),
});
```

### Send Webhook with Page Context

```typescript
import { sendWebhook } from "@/lib/webhook-service";

// Automatically uses page-specific or global webhook
await sendWebhook(userId, payload, {
  pageId: "page-123",
  pageType: "registration",
});
```

### Get Effective Webhook Config

```typescript
import { getWebhookConfig } from "@/lib/webhook-service";

const config = await getWebhookConfig(userId, pageId, pageType);
// Returns: { enabled, url, secret, isInherited }
```

## Integration Points

To add the webhook settings UI to a page builder:

```tsx
import { PageWebhookSettings } from "@/components/pages/page-webhook-settings";

<PageWebhookSettings
  pageId={pageId}
  pageType="registration" // or "enrollment" or "watch"
/>;
```

## Testing

Run the webhook configuration tests:

```bash
npx vitest run __tests__/unit/lib/webhook-config.test.ts
```

All tests passing ✅

## Next Steps

To fully integrate this feature:

1. **Add webhook settings to page builders**
   - Registration page builder/editor
   - Watch page builder/editor
   - Enrollment page builder/editor

2. **Add webhook status to pages list**
   - Show which pages have custom webhooks
   - Indicate inherited vs custom in UI

3. **Create admin dashboard view**
   - Show all pages and their webhook configurations
   - Bulk actions for webhook management

## Files Modified

- ✅ `supabase/migrations/20251030201952_add_page_webhooks.sql` (new)
- ✅ `types/pages.ts` (updated)
- ✅ `lib/webhook-service.ts` (refactored)
- ✅ `app/api/contacts/route.ts` (updated)
- ✅ `app/api/analytics/track/route.ts` (updated)
- ✅ `app/api/pages/[pageId]/webhook/route.ts` (new)
- ✅ `components/pages/page-webhook-settings.tsx` (new)
- ✅ `app/settings/integrations/page.tsx` (updated)
- ✅ `docs/webhooks.md` (updated)
- ✅ `__tests__/unit/lib/webhook-config.test.ts` (new)
- ✅ `docs/WEBHOOK_PAGE_LEVEL_IMPLEMENTATION.md` (new)

## Database Schema Changes

```sql
-- Added to registration_pages, enrollment_pages, watch_pages
ALTER TABLE public.[table_name]
  ADD COLUMN webhook_enabled BOOLEAN DEFAULT NULL,
  ADD COLUMN webhook_url TEXT,
  ADD COLUMN webhook_secret TEXT,
  ADD COLUMN webhook_inherit_global BOOLEAN DEFAULT true;
```

## API Endpoints Added

- `GET /api/pages/[pageId]/webhook?pageType={type}` - Get page webhook config
- `PUT /api/pages/[pageId]/webhook` - Update page webhook config
- `POST /api/pages/[pageId]/webhook` - Test page webhook

## Security Considerations

- ✅ Webhook secrets stored securely in database
- ✅ HMAC-SHA256 signatures for webhook verification
- ✅ User authentication required for all webhook endpoints
- ✅ Ownership verification before reading/updating page webhooks
- ✅ Input validation for webhook URLs

## Performance Impact

- ✅ Minimal - one additional database query when sending webhooks with page context
- ✅ Query is efficient with proper indexes
- ✅ Caching opportunity for frequently accessed page configs (future optimization)
