# Webhook Migration Guide: Global to Page-Level

## What Changed?

Webhooks in Genie AI now support **two levels of configuration**:

1. **Global Webhooks** (Settings → Integrations)
   - Default webhook for all pages
   - Simplest option for single-CRM setups

2. **Page-Level Webhooks** (Individual Page Settings)
   - Custom webhooks per page
   - Override global settings
   - Perfect for multi-CRM or complex automation setups

## Do I Need to Do Anything?

**No!** Your existing webhooks continue working exactly as before.

All pages default to using the global webhook settings. Nothing breaks, nothing changes
unless you want it to.

## When Should I Use Page-Level Webhooks?

Consider page-level webhooks when:

- **Multiple CRMs** - Different funnels send leads to different CRMs
- **Product Segmentation** - Separate leads by product/offer
- **A/B Testing** - Test different automation workflows
- **Client Separation** - Managing funnels for different clients
- **Granular Control** - Need different webhooks for registration vs enrollment

## How to Configure Page-Level Webhooks

### Step 1: Navigate to Your Page

Go to any registration, watch, or enrollment page in your funnel.

### Step 2: Find Webhook Settings

Look for the "Webhooks" section in page settings (this will be added to page builders in
the next update).

For now, use the API directly:

```typescript
// Get current webhook configuration
const response = await fetch(`/api/pages/${pageId}/webhook?pageType=registration`);
const { pageConfig, effectiveConfig } = await response.json();

// Update to use custom webhook
await fetch(`/api/pages/${pageId}/webhook`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pageType: "registration",
    webhook_enabled: true,
    webhook_url: "https://your-crm.com/webhook-for-this-page",
    webhook_secret: "page-specific-secret",
    webhook_inherit_global: false, // Don't inherit from global
  }),
});
```

### Step 3: Test Your Webhook

```typescript
// Send a test webhook for the page
await fetch(`/api/pages/${pageId}/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pageType: "registration",
  }),
});
```

## Using the React Component

If you're building a page editor UI:

```tsx
import { PageWebhookSettings } from "@/components/pages/page-webhook-settings";

function PageEditor({ pageId, pageType }) {
  return (
    <div>
      {/* Other page settings */}

      <PageWebhookSettings
        pageId={pageId}
        pageType={pageType} // "registration" | "enrollment" | "watch"
      />
    </div>
  );
}
```

## Understanding Inheritance

```
┌─────────────────────────────────────┐
│  Global Webhook Settings            │
│  (Settings → Integrations)          │
│                                     │
│  URL: https://global-crm.com/hook   │
│  Enabled: Yes                       │
└─────────────────────────────────────┘
                 ↓
                 ↓ (inherited by default)
                 ↓
    ┌────────────────────────┐
    │  Page 1                │
    │  Inherit: ✓            │
    │  Uses: Global          │
    └────────────────────────┘

    ┌────────────────────────┐
    │  Page 2                │
    │  Inherit: ✗            │
    │  Custom URL: page2.com │
    │  Uses: Custom          │
    └────────────────────────┘

    ┌────────────────────────┐
    │  Page 3                │
    │  Inherit: ✓            │
    │  Uses: Global          │
    └────────────────────────┘
```

## API Reference

### Get Page Webhook Configuration

```http
GET /api/pages/{pageId}/webhook?pageType={registration|enrollment|watch}
```

**Response:**

```json
{
  "pageConfig": {
    "webhook_enabled": true,
    "webhook_url": "https://custom.com/hook",
    "webhook_secret": "secret",
    "webhook_inherit_global": false
  },
  "effectiveConfig": {
    "enabled": true,
    "url": "https://custom.com/hook",
    "secret": "secret",
    "isInherited": false
  }
}
```

### Update Page Webhook Configuration

```http
PUT /api/pages/{pageId}/webhook
Content-Type: application/json

{
  "pageType": "registration",
  "webhook_enabled": true,
  "webhook_url": "https://your-crm.com/hook",
  "webhook_secret": "optional-secret",
  "webhook_inherit_global": false
}
```

### Test Page Webhook

```http
POST /api/pages/{pageId}/webhook
Content-Type: application/json

{
  "pageType": "registration"
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "isInherited": false
}
```

## Programmatic Access

### In Server-Side Code

```typescript
import { getWebhookConfig, sendWebhook } from "@/lib/webhook-service";

// Get effective webhook configuration
const config = await getWebhookConfig(userId, pageId, "registration");
console.log(config);
// { enabled: true, url: "...", secret: "...", isInherited: false }

// Send webhook (automatically uses page-level or global)
await sendWebhook(userId, payload, {
  pageId: pageId,
  pageType: "registration",
});
```

### In Client-Side Code

```typescript
// Load configuration
const response = await fetch(`/api/pages/${pageId}/webhook?pageType=registration`);
const { effectiveConfig } = await response.json();

if (effectiveConfig.isInherited) {
  console.log("Using global webhook");
} else {
  console.log("Using page-specific webhook");
}
```

## Migration Scenarios

### Scenario 1: Keep Everything Global

**Do nothing!** Your existing setup works perfectly.

### Scenario 2: Migrate One Page to Custom Webhook

```typescript
// Set one page to use custom webhook
await fetch(`/api/pages/${pageId}/webhook`, {
  method: "PUT",
  body: JSON.stringify({
    pageType: "registration",
    webhook_enabled: true,
    webhook_url: "https://new-crm.com/hook",
    webhook_inherit_global: false,
  }),
});

// All other pages still use global webhook
```

### Scenario 3: Different Webhooks per Funnel

```typescript
// Set all pages in Funnel A to CRM 1
for (const page of funnelAPages) {
  await updatePageWebhook(page.id, "https://crm1.com/hook");
}

// Set all pages in Funnel B to CRM 2
for (const page of funnelBPages) {
  await updatePageWebhook(page.id, "https://crm2.com/hook");
}

function updatePageWebhook(pageId, url) {
  return fetch(`/api/pages/${pageId}/webhook`, {
    method: "PUT",
    body: JSON.stringify({
      pageType: "registration",
      webhook_enabled: true,
      webhook_url: url,
      webhook_inherit_global: false,
    }),
  });
}
```

### Scenario 4: Revert to Global

```typescript
// Switch page back to using global webhook
await fetch(`/api/pages/${pageId}/webhook`, {
  method: "PUT",
  body: JSON.stringify({
    pageType: "registration",
    webhook_inherit_global: true, // Back to global
  }),
});
```

## Troubleshooting

### Webhook Not Firing

1. Check if webhook is enabled:

   ```typescript
   const { effectiveConfig } = await fetch(
     `/api/pages/${pageId}/webhook?pageType=registration`
   ).then((r) => r.json());

   console.log("Enabled:", effectiveConfig.enabled);
   console.log("URL:", effectiveConfig.url);
   ```

2. Test the webhook:

   ```typescript
   const result = await fetch(`/api/pages/${pageId}/webhook`, {
     method: "POST",
     body: JSON.stringify({ pageType: "registration" }),
   }).then((r) => r.json());

   console.log("Test result:", result);
   ```

### Wrong Webhook Being Used

Check the inheritance status:

```typescript
const { effectiveConfig } = await fetch(
  `/api/pages/${pageId}/webhook?pageType=registration`
).then((r) => r.json());

if (effectiveConfig.isInherited) {
  console.log("Page is using GLOBAL webhook");
  console.log("To use custom webhook, set webhook_inherit_global: false");
} else {
  console.log("Page is using CUSTOM webhook");
}
```

### Bulk Update All Pages

```typescript
// Get all pages for a funnel
const pages = await getPages(funnelId);

// Update webhook for each page
for (const page of pages) {
  await fetch(`/api/pages/${page.id}/webhook`, {
    method: "PUT",
    body: JSON.stringify({
      pageType: page.type,
      webhook_enabled: true,
      webhook_url: "https://new-webhook-url.com",
      webhook_secret: "new-secret",
      webhook_inherit_global: false,
    }),
  });
}
```

## Database Schema

For reference, here's what was added to the database:

```sql
-- Added to registration_pages, enrollment_pages, watch_pages
ALTER TABLE public.registration_pages
  ADD COLUMN webhook_enabled BOOLEAN DEFAULT NULL,
  ADD COLUMN webhook_url TEXT,
  ADD COLUMN webhook_secret TEXT,
  ADD COLUMN webhook_inherit_global BOOLEAN DEFAULT true;

-- NULL webhook_enabled = inherit from global
-- webhook_inherit_global = true means use global settings
```

## Support

For questions or issues:

- Check the [Webhook Documentation](./docs/webhooks.md)
- Review [Implementation Details](./docs/WEBHOOK_PAGE_LEVEL_IMPLEMENTATION.md)
- Open an issue on GitHub

## Summary

✅ **Backward Compatible** - Existing webhooks work unchanged ✅ **Flexible** - Use
global or per-page webhooks ✅ **Easy Migration** - Switch incrementally or not at all
✅ **Well Tested** - Comprehensive test coverage ✅ **Documented** - Full API and usage
documentation
