# Webhook Integration

Automatically send contact data to your CRM when visitors register through your funnel
pages.

## Overview

The webhook integration sends real-time notifications to your CRM whenever someone
registers through your Genie AI funnel. This allows you to:

- Automatically add leads to your CRM (GoHighLevel, HubSpot, Salesforce, etc.)
- Trigger automation workflows
- Track lead sources and UTM parameters
- Build custom integrations with tools like Make.com or Zapier

## Setup

### 1. Navigate to Settings

Go to **Settings → Integrations** in your Genie AI dashboard.

### 2. Enable Webhook

Toggle the webhook switch to enable the integration.

### 3. Enter Your Webhook URL

Paste your CRM's webhook URL. Examples:

- **GoHighLevel**: Create a custom webhook trigger in Automation → Workflows
- **Make.com**: Create a webhook module and copy the URL
- **Zapier**: Create a "Catch Hook" trigger and use the provided URL
- **Custom**: Any HTTPS endpoint that accepts POST requests

### 4. (Optional) Add Webhook Secret

For additional security, add a secret key. We'll use this to sign requests with
HMAC-SHA256, allowing you to verify the webhook came from Genie AI.

### 5. Test Your Webhook

Click "Send test webhook" to verify your endpoint receives data correctly.

## Webhook Payload

When someone registers, we send a POST request with this payload:

```json
{
  "event": "registration.submitted",
  "timestamp": "2025-01-24T12:00:00Z",
  "data": {
    "email": "user@example.com",
    "name": "John Doe",
    "funnel": {
      "projectId": "abc-123",
      "projectName": "My Masterclass Funnel",
      "pageId": "page-456",
      "pageUrl": "https://genieai.com/yourname/my-funnel/register"
    },
    "visitor": {
      "id": "visitor-789",
      "userAgent": "Mozilla/5.0...",
      "referrer": "https://google.com"
    },
    "utm": {
      "source": "facebook",
      "medium": "cpc",
      "campaign": "summer-promo",
      "term": "online-course",
      "content": "ad-variant-a"
    }
  }
}
```

### Headers

```
Content-Type: application/json
User-Agent: GenieAI/1.0
X-Webhook-Signature: [HMAC-SHA256 signature] (if secret configured)
```

## Verifying Webhook Signatures

If you configured a webhook secret, we include an `X-Webhook-Signature` header with an
HMAC-SHA256 signature.

To verify the signature in your webhook handler:

```javascript
const crypto = require("crypto");

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// In your webhook handler:
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, YOUR_SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  // Process the webhook...
  res.status(200).send("OK");
});
```

## Retry Logic

If your webhook endpoint returns an error (non-2xx status code) or times out, we'll
retry:

- **Max retries**: 3 attempts
- **Retry delay**: 1 second (with exponential backoff)
- **Timeout**: 30 seconds per attempt

All webhook deliveries (successful and failed) are logged in the `webhook_logs` table
for debugging.

## CRM-Specific Setup Guides

### GoHighLevel

1. Go to **Automation → Workflows**
2. Create a new workflow or edit an existing one
3. Add a **Custom Webhook** trigger
4. Copy the webhook URL
5. Paste it in Genie AI Settings → Integrations
6. Map the incoming data fields to GoHighLevel contact fields

### Make.com

1. Create a new scenario
2. Add a **Webhooks** module and select "Custom webhook"
3. Click "Create a webhook" and copy the URL
4. Paste it in Genie AI Settings → Integrations
5. Add the webhook data to whatever services you want (Google Sheets, email, etc.)

### Zapier

1. Create a new Zap
2. Choose **Webhooks by Zapier** as the trigger
3. Select **Catch Hook**
4. Copy the webhook URL
5. Paste it in Genie AI Settings → Integrations
6. Send a test to populate the fields
7. Continue your Zap with any actions you need

## Webhook Events

Currently, we send webhooks for:

- `registration.submitted` - When someone submits a registration form

Future events (coming soon):

- `video.watched` - When someone watches your pitch video
- `enrollment.viewed` - When someone views the enrollment page
- `purchase.completed` - When someone completes a purchase

## Troubleshooting

### Webhook not received

1. Check your webhook URL is correct and accessible
2. Make sure your endpoint accepts POST requests
3. Check webhook logs in your CRM/tool
4. Send a test webhook to verify connectivity

### Signature verification failing

1. Make sure you're using the same secret in both systems
2. Verify you're computing HMAC-SHA256 correctly
3. Ensure you're comparing the raw request body, not parsed JSON

### Timeouts

1. Make sure your endpoint responds within 30 seconds
2. Process webhook data asynchronously if needed
3. Return 200 OK immediately, then process in the background

## Webhook Logs

All webhook deliveries are logged in the database. You can query them for debugging:

```sql
SELECT * FROM webhook_logs
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;
```

Each log includes:

- Event type
- Payload sent
- Webhook URL
- HTTP status code
- Success/failure status
- Error messages (if any)
- Retry attempts

## Best Practices

1. **Return quickly**: Respond with 200 OK as fast as possible. Process data
   asynchronously.
2. **Verify signatures**: Always verify webhook signatures if using a secret.
3. **Handle duplicates**: The same event might be delivered multiple times if retries
   occur.
4. **Log everything**: Keep logs of received webhooks for debugging.
5. **Test thoroughly**: Use the test webhook feature to verify your setup.

## Security

- Always use HTTPS endpoints
- Configure a webhook secret and verify signatures
- Validate all incoming data before processing
- Rate limit your webhook endpoint to prevent abuse
- Keep webhook URLs private (don't commit them to public repos)

## Support

If you need help setting up webhooks, contact support or check our community forum.
