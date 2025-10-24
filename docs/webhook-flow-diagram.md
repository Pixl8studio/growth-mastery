# Webhook Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Webhook Integration Flow                       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   User      │ 1. Configure Webhook URL
│  (Settings) │────────────────────────┐
└─────────────┘                        │
                                       ▼
                            ┌─────────────────────┐
                            │   user_profiles     │
                            │  - webhook_enabled  │
                            │  - crm_webhook_url  │
                            │  - webhook_secret   │
                            └─────────────────────┘

┌─────────────┐
│  Visitor    │ 2. Registers on Funnel Page
│ (Public)    │────────────────────────┐
└─────────────┘                        │
                                       ▼
                            ┌─────────────────────┐
                            │  POST /api/contacts │
                            │                     │
                            │  Creates contact in │
                            │     database        │
                            └──────────┬──────────┘
                                       │
                                       │ 3. Trigger Webhook
                                       ▼
                            ┌─────────────────────┐
                            │  Build Payload      │
                            │  - Contact data     │
                            │  - Funnel info      │
                            │  - UTM params       │
                            │  - Visitor info     │
                            └──────────┬──────────┘
                                       │
                                       │ 4. Send (Non-blocking)
                                       ▼
                            ┌─────────────────────┐
                            │  sendWebhook()      │
                            │                     │
                            │  - Generate HMAC    │
                            │  - POST to CRM      │
                            │  - Auto retry       │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
         ┌─────────────────────┐             ┌─────────────────────┐
         │   webhook_logs      │             │    User's CRM       │
         │                     │             │                     │
         │  - Success/Failure  │             │  - GoHighLevel      │
         │  - Status code      │             │  - Make.com         │
         │  - Error message    │             │  - Zapier           │
         │  - Retry attempts   │             │  - Custom endpoint  │
         └─────────────────────┘             └─────────────────────┘
```

## Detailed Sequence Diagram

```
User          Settings Page    API             Webhook Service      CRM
 │                 │             │                    │               │
 │  Configure      │             │                    │               │
 │  Webhook URL    │             │                    │               │
 │────────────────>│             │                    │               │
 │                 │             │                    │               │
 │                 │  Save to    │                    │               │
 │                 │  database   │                    │               │
 │                 │────────────>│                    │               │
 │                 │             │                    │               │
 │  Test Webhook   │             │                    │               │
 │────────────────>│             │                    │               │
 │                 │             │                    │               │
 │                 │  POST       │                    │               │
 │                 │  /webhook/  │                    │               │
 │                 │  test       │                    │               │
 │                 │────────────>│                    │               │
 │                 │             │                    │               │
 │                 │             │  sendWebhook()     │               │
 │                 │             │───────────────────>│               │
 │                 │             │                    │               │
 │                 │             │                    │  POST         │
 │                 │             │                    │  {test data}  │
 │                 │             │                    │──────────────>│
 │                 │             │                    │               │
 │                 │             │                    │  200 OK       │
 │                 │             │                    │<──────────────│
 │                 │             │                    │               │
 │                 │             │  Success           │               │
 │                 │             │<───────────────────│               │
 │                 │             │                    │               │
 │                 │  Success    │                    │               │
 │                 │<────────────│                    │               │
 │                 │             │                    │               │
 │  ✓ Confirmed    │             │                    │               │
 │<────────────────│             │                    │               │
 │                 │             │                    │               │


Visitor       Registration      Contacts API      Webhook Service     CRM
 │            Page                    │                    │            │
 │                 │                  │                    │            │
 │  Fill Form      │                  │                    │            │
 │────────────────>│                  │                    │            │
 │                 │                  │                    │            │
 │  Submit         │                  │                    │            │
 │────────────────>│                  │                    │            │
 │                 │                  │                    │            │
 │                 │  POST            │                    │            │
 │                 │  /api/contacts   │                    │            │
 │                 │─────────────────>│                    │            │
 │                 │                  │                    │            │
 │                 │                  │  1. Create contact │            │
 │                 │                  │     in database    │            │
 │                 │                  │                    │            │
 │                 │                  │  2. Build payload  │            │
 │                 │                  │                    │            │
 │                 │                  │  3. Send webhook   │            │
 │                 │                  │     (async)        │            │
 │                 │                  │───────────────────>│            │
 │                 │                  │                    │            │
 │                 │  Success         │                    │            │
 │                 │  (immediate)     │                    │            │
 │                 │<─────────────────│                    │            │
 │                 │                  │                    │            │
 │  Success        │                  │                    │  POST      │
 │  Message        │                  │                    │  {contact} │
 │<────────────────│                  │                    │───────────>│
 │                 │                  │                    │            │
 │                 │                  │                    │  200 OK    │
 │                 │                  │                    │<───────────│
 │                 │                  │                    │            │
 │                 │                  │                    │  Log       │
 │                 │                  │                    │  delivery  │
 │                 │                  │                    │            │
```

## Data Flow

### 1. Configuration Phase

```
User → Settings UI → Database
  └─> webhook_enabled: true
  └─> crm_webhook_url: "https://crm.example.com/webhook"
  └─> webhook_secret: "optional-secret-key"
```

### 2. Registration Event

```
Visitor Form Submission
         │
         ▼
    POST /api/contacts
         │
         ├─> Contact Created in DB
         │   └─> contacts table
         │
         └─> Webhook Triggered (async)
             │
             ├─> Fetch user webhook settings
             │   └─> user_profiles table
             │
             ├─> Build webhook payload
             │   └─> Contact data
             │   └─> Funnel info
             │   └─> UTM parameters
             │   └─> Visitor metadata
             │
             ├─> Generate HMAC signature (if secret configured)
             │   └─> HMAC-SHA256(payload, secret)
             │
             ├─> Send POST to CRM
             │   └─> Headers:
             │       ├─> Content-Type: application/json
             │       ├─> User-Agent: GenieAI/1.0
             │       └─> X-Webhook-Signature: [signature]
             │
             ├─> Handle response
             │   ├─> Success (2xx) → Log success
             │   └─> Failure → Retry up to 3 times
             │
             └─> Log delivery attempt
                 └─> webhook_logs table
```

## Webhook Payload Structure

```json
{
  "event": "registration.submitted",
  "timestamp": "ISO-8601 timestamp",
  "data": {
    "email": "Contact email",
    "name": "Contact name",
    "funnel": {
      "projectId": "UUID",
      "projectName": "Human-readable name",
      "pageId": "UUID",
      "pageUrl": "Full page URL"
    },
    "visitor": {
      "id": "Visitor tracking ID",
      "userAgent": "Browser user agent",
      "referrer": "Referring URL"
    },
    "utm": {
      "source": "UTM source",
      "medium": "UTM medium",
      "campaign": "UTM campaign",
      "term": "UTM term",
      "content": "UTM content"
    }
  }
}
```

## Retry Flow

```
Attempt 1 (Immediate)
  │
  ├─> Success (2xx) → Done
  │
  └─> Failure (non-2xx or timeout)
      │
      ▼
  Wait 1 second
      │
      ▼
Attempt 2
  │
  ├─> Success (2xx) → Done
  │
  └─> Failure
      │
      ▼
  Wait 2 seconds (exponential backoff)
      │
      ▼
Attempt 3 (Final)
  │
  ├─> Success (2xx) → Done
  │
  └─> Failure → Give up, log error
```

## Database Schema

```
user_profiles
├─ id (UUID, PK)
├─ webhook_enabled (BOOLEAN)
├─ crm_webhook_url (TEXT)
└─ webhook_secret (TEXT)

webhook_logs
├─ id (UUID, PK)
├─ user_id (UUID, FK → user_profiles)
├─ event_type (TEXT)
├─ payload (JSONB)
├─ webhook_url (TEXT)
├─ status_code (INTEGER)
├─ success (BOOLEAN)
├─ error_message (TEXT)
├─ attempt_number (INTEGER)
├─ delivered_at (TIMESTAMPTZ)
└─ created_at (TIMESTAMPTZ)

contacts
├─ id (UUID, PK)
├─ user_id (UUID, FK → user_profiles)
├─ funnel_project_id (UUID, FK → funnel_projects)
├─ email (TEXT)
├─ name (TEXT)
├─ utm_source (TEXT)
├─ utm_medium (TEXT)
├─ utm_campaign (TEXT)
└─ ... (other fields)
```

## Security Flow

```
1. User configures webhook_secret
         │
         ▼
2. Webhook triggered
         │
         ▼
3. Generate signature:
   HMAC-SHA256(JSON.stringify(payload), secret)
         │
         ▼
4. Add header:
   X-Webhook-Signature: [hex signature]
         │
         ▼
5. Send to CRM endpoint
         │
         ▼
6. CRM verifies signature:
   - Generate expected signature
   - Compare with received signature
   - Reject if mismatch
```

## Error Handling

```
Try to send webhook
  │
  ├─> Network error
  │   └─> Retry with backoff
  │
  ├─> Timeout (30s)
  │   └─> Retry with backoff
  │
  ├─> 4xx status (client error)
  │   └─> Log error, don't retry
  │
  ├─> 5xx status (server error)
  │   └─> Retry with backoff
  │
  └─> Success
      └─> Log success
```

## Non-blocking Execution

```
API Request (/api/contacts)
  │
  ├─> [Synchronous] Create contact
  │   └─> Insert into database
  │   └─> Return success to user
  │
  └─> [Asynchronous] Send webhook
      └─> void (async () => { ... })()
      └─> Doesn't block API response
      └─> Runs in background
```

This ensures:

- Fast API responses (not waiting for webhook)
- Reliable contact creation (not dependent on webhook)
- Best-effort webhook delivery (with retries)
- Comprehensive logging (for debugging)
