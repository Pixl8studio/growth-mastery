# Service Setup Tracker

Track your progress setting up all external services and API keys for Genie AI.

## 📊 Quick Status Dashboard

Mark services as you complete them:

### 🔴 Required (Core Functionality)

- [ ] Supabase - Database & Authentication
- [ ] OpenAI - AI Content Generation
- [ ] Stripe - Payment Processing

### 🟡 Recommended (Major Features)

- [ ] VAPI - AI Phone Calls
- [ ] Gamma - Presentation Generation
- [ ] Cloudflare Stream - Video Hosting
- [ ] SendGrid - Email Sending
- [ ] Twilio - SMS Sending

### 🟢 Optional (Enhanced Features)

- [ ] Vercel - Custom Domains
- [ ] Google Cloud - Drive/Gmail/Calendar
- [ ] Facebook/Meta - Social Media
- [ ] Twitter (X) - Social Media

### 🔧 Monitoring & Security

- [ ] Integration Encryption Key - Token Security
- [ ] Sentry - Error Tracking (Optional)
- [ ] Logfire - Logging & Observability (Optional)

---

## 🚀 Setup Priority Guide

### Phase 1: Core Services (Start Here)

Complete these three to get basic functionality working.

### Phase 2: Major Features

Add these to enable full funnel building, video hosting, and follow-ups.

### Phase 3: Integrations

Add social media and Google integrations as needed.

### Phase 4: Production Polish

Set up monitoring and observability before launch.

---

## 🔴 REQUIRED SERVICES

### 1. Supabase - Database & Authentication

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Core database, authentication, and real-time features

**Sign up:** https://supabase.com/dashboard

**Setup Steps:**

1. Create a new project at https://supabase.com/dashboard
2. Wait for project to provision (~2 minutes)
3. Go to Project Settings → API
4. Copy the following values:

**Environment Variables:**

```bash
# Found at: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_ID=xxxxx
```

**Reference:** `env.example` lines 20-24

**Testing:**

```bash
npm run test:supabase-connection
```

**Notes:**

- ⚠️ Keep `SUPABASE_SERVICE_ROLE_KEY` secret - it bypasses all RLS policies
- The anon key is safe to expose in client-side code
- Project ID is in your project URL

---

### 2. OpenAI - AI Content Generation

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Powers all AI content generation (deck structure, copy, scripts)

**Sign up:** https://platform.openai.com/signup

**Setup Steps:**

1. Create account at https://platform.openai.com
2. Add payment method (required for API access)
3. Create API key at https://platform.openai.com/api-keys
4. Create an Assistant at https://platform.openai.com/assistants

**Environment Variables:**

```bash
# API Key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...

# Assistant ID from: https://platform.openai.com/assistants
OPENAI_ASSISTANT_ID=asst_...
```

**Reference:** `env.example` lines 29-34

**Testing:**

- Try generating content in the funnel builder
- Check the AI help widget in the dashboard

**Cost Estimates:**

- Typical deck generation: $0.50-$2.00
- Help widget queries: $0.01-$0.10 each
- Set up usage limits in OpenAI dashboard

**Notes:**

- Start with GPT-4o for best results
- Monitor usage at https://platform.openai.com/usage
- Set spending limits to avoid surprises

---

### 3. Stripe - Payment Processing

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Payment processing and Stripe Connect for user payouts

**Sign up:** https://dashboard.stripe.com/register

**Setup Steps:**

1. Create Stripe account
2. Complete business verification
3. Get API keys from https://dashboard.stripe.com/test/apikeys
4. Create Connect application at https://dashboard.stripe.com/settings/applications
5. Set up webhook endpoint at https://dashboard.stripe.com/test/webhooks

**Environment Variables:**

```bash
# API Keys from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Connect from: https://dashboard.stripe.com/settings/applications
STRIPE_CONNECT_CLIENT_ID=ca_...

# Webhook from: https://dashboard.stripe.com/test/webhooks
# Endpoint URL: https://yourdomain.com/api/stripe/webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# Platform Fees (your commission on sales)
STRIPE_PLATFORM_FEE_PERCENT=20      # 20% commission
STRIPE_PLATFORM_FEE_FIXED=50        # + $0.50 per transaction
```

**Reference:** `env.example` lines 64-79

**Webhook Events to Listen For:**

- `checkout.session.completed`
- `account.updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**Testing:**

- Use test cards: `4242 4242 4242 4242` (Visa)
- Test Connect onboarding flow
- Verify webhook delivery in Stripe dashboard

**Documentation:**

- See `docs/STRIPE_SETUP.md` for detailed setup
- Stripe Connect guide: https://stripe.com/docs/connect

**Notes:**

- Start with test mode, switch to live mode for production
- Connect requires business verification
- Webhook signing secret changes between test/live mode

---

## 🟡 RECOMMENDED SERVICES

### 4. VAPI - AI Phone Calls

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** AI-powered intake calls and voice interactions

**Sign up:** https://dashboard.vapi.ai

**Setup Steps:**

1. Create VAPI account
2. Purchase a phone number
3. Create an assistant
4. Set up webhook endpoint
5. Get API keys from dashboard

**Environment Variables:**

```bash
# All from: https://dashboard.vapi.ai
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_phone_number_id
VAPI_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

**Reference:** `env.example` lines 39-44

**Webhook Endpoint:**

- URL: `https://yourdomain.com/api/vapi/webhook`
- Events: `call.started`, `call.ended`

**Testing:**

- Make a test call to your VAPI number
- Check webhook logs in VAPI dashboard
- Verify call transcripts are saved

**Notes:**

- Phone numbers cost ~$1/month
- Usage billed per minute
- Supports multiple languages

---

### 5. Gamma - Presentation Generation

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Generates beautiful slide decks from AI content

**Sign up:** https://gamma.app

**Setup Steps:**

1. Create Gamma account
2. Go to Settings → API
3. Generate API key

**Environment Variables:**

```bash
# From: https://gamma.app/settings/api
GAMMA_API_KEY=your_gamma_api_key
```

**Reference:** `env.example` lines 49-50

**Testing:**

- Try generating a deck in funnel builder
- Verify deck opens in Gamma

**Cost:**

- Check Gamma's pricing page for API costs
- Usually includes free tier for development

**Notes:**

- Generates decks in ~30-60 seconds
- Supports custom themes
- Can export to PDF/PowerPoint

---

### 6. Cloudflare Stream - Video Hosting

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Video hosting and streaming for funnel videos

**Sign up:** https://dash.cloudflare.com

**Setup Steps:**

1. Create Cloudflare account
2. Enable Stream product
3. Get Account ID from dashboard
4. Create API token with Stream permissions

**Environment Variables:**

```bash
# From: https://dash.cloudflare.com
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_API_TOKEN=your_stream_token
```

**Reference:** `env.example` lines 55-57

**API Token Permissions:**

- Stream: Read & Edit

**Testing:**

- Upload a test video in funnel builder
- Verify video plays with adaptive streaming
- Check analytics in Cloudflare dashboard

**Pricing:**

- $1 per 1,000 minutes stored
- $1 per 1,000 minutes delivered
- Very cost-effective for most use cases

**Notes:**

- Automatic encoding and adaptive bitrate
- Global CDN delivery
- Built-in analytics

---

### 7. SendGrid - Email Sending

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Transactional emails and AI follow-up sequences

**Sign up:** https://sendgrid.com

**Setup Steps:**

1. Create SendGrid account
2. Verify sender email address
3. Create API key at https://app.sendgrid.com/settings/api_keys
4. Set up domain authentication (recommended for production)

**Environment Variables:**

```bash
# From: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.xxxxx

# Your verified sender email
SENDGRID_VERIFIED_SENDER_EMAIL=noreply@yourdomain.com
```

**Reference:** `env.example` lines 128-130

**Setup Webhook (Optional):**

- URL: `https://yourdomain.com/api/followup/webhook/sendgrid`
- Events: Delivered, Opened, Clicked, Bounced

**Testing:**

- Send test email through follow-up system
- Check SendGrid activity feed
- Verify email delivery

**Pricing:**

- Free tier: 100 emails/day
- Paid plans start at $15/month

**Notes:**

- Must verify sender domain for production
- Set up SPF and DKIM records
- Monitor sender reputation

---

### 8. Twilio - SMS Sending

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** SMS notifications and AI follow-up sequences

**Sign up:** https://console.twilio.com

**Setup Steps:**

1. Create Twilio account
2. Purchase a phone number
3. Get Account SID and Auth Token from console

**Environment Variables:**

```bash
# From: https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Reference:** `env.example` lines 136-138

**Testing:**

- Send test SMS to your phone
- Verify delivery in Twilio console
- Check message logs

**Pricing:**

- Phone number: ~$1/month
- SMS: $0.0075 per message (US)
- Check rates for your country

**Notes:**

- Requires phone verification
- Follow spam/compliance rules
- Set up opt-out handling

---

## 🟢 OPTIONAL SERVICES

### 9. Vercel - Custom Domains

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Allows users to add custom domains to their funnels

**Sign up:** https://vercel.com

**Setup Steps:**

1. Deploy your app to Vercel (or use existing deployment)
2. Create access token at https://vercel.com/account/tokens
3. Get Project ID from project settings

**Environment Variables:**

```bash
# From: https://vercel.com/account/tokens
VERCEL_TOKEN=your_vercel_access_token

# From: Project Settings
VERCEL_PROJECT_ID=prj_xxxxx

# If using teams
VERCEL_TEAM_ID=team_xxxxx
```

**Reference:** `env.example` lines 85-88

**Token Permissions:**

- Must have domain management access

**Testing:**

- Try adding a test domain through your app
- Verify DNS configuration
- Test domain resolution

**Notes:**

- Only needed if offering custom domains
- Requires domain DNS configuration
- Users must own the domain

---

### 10. Google Cloud - Drive, Gmail & Calendar

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Google Drive intake, Gmail sending, Calendar scheduling

**Sign up:** https://console.cloud.google.com

**Setup Steps:**

1. Create new project in Google Cloud Console
2. Enable APIs: Drive API, Gmail API, Calendar API
3. Create OAuth 2.0 credentials
4. Configure OAuth consent screen
5. Add authorized redirect URIs

**Environment Variables:**

```bash
# From: https://console.cloud.google.com/apis/credentials

# For Google Drive Intake
GOOGLE_DRIVE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=xxxxx
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/intake/google-drive/callback

# For Gmail & Calendar OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

**Reference:** `env.example` lines 94-116

**Required OAuth Scopes:**

- Drive: `https://www.googleapis.com/auth/drive.readonly`
- Gmail: `https://www.googleapis.com/auth/gmail.send`
- Calendar: `https://www.googleapis.com/auth/calendar`

**OAuth Consent Screen:**

- Add your domain
- Request verification if needed
- Set up privacy policy URL

**Testing:**

- Test Drive file selection
- Send test email via Gmail
- Create test calendar event

**Documentation:**

- See `docs/CLAUDE_AUTH_SETUP.md` for OAuth details

**Notes:**

- Requires OAuth verification for production
- Limited to 100 users before verification
- Keep credentials secure

---

### 11. Facebook/Meta - Social Media Integration

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Facebook and Instagram posting integrations

**Sign up:** https://developers.facebook.com

**Setup Steps:**

1. Create Facebook Developer account
2. Create new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs
5. Get App ID and Secret

**Environment Variables:**

```bash
# From: https://developers.facebook.com/apps/
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Instagram uses Facebook OAuth
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
```

**Reference:** `env.example` lines 103-108

**Required Permissions:**

- `pages_manage_posts`
- `instagram_basic`
- `instagram_content_publish`

**App Review:**

- Required for production use
- Submit for review with video demo
- Explain use case clearly

**Testing:**

- Test connection with test Facebook account
- Try posting to test page
- Verify webhook delivery

**Notes:**

- Instagram requires business account
- App review takes 3-7 days
- Follow platform policies strictly

---

### 12. Twitter (X) - Social Media Integration

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Twitter/X posting integration

**Sign up:** https://developer.twitter.com/en/portal/dashboard

**Setup Steps:**

1. Apply for Twitter Developer account
2. Create project and app
3. Enable OAuth 2.0
4. Get Client ID and Secret
5. Set up callback URLs

**Environment Variables:**

```bash
# From: https://developer.twitter.com/en/portal/dashboard
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

**Reference:** `env.example` lines 111-112

**Required Access:**

- Read and write permissions
- OAuth 2.0 enabled

**Testing:**

- Connect test Twitter account
- Post test tweet
- Verify in Twitter dashboard

**Notes:**

- Free tier available
- Paid tiers for higher limits
- Follow automation rules

---

## 🔐 SECURITY & MONITORING

### 13. Integration Encryption Key

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Encrypts OAuth tokens and sensitive integration data

**Generate Key:**

```bash
openssl rand -base64 32
```

**Environment Variables:**

```bash
# Generate with: openssl rand -base64 32
INTEGRATION_ENCRYPTION_KEY=your_random_32_char_encryption_key
```

**Reference:** `env.example` lines 122-123

**Security:**

- ⚠️ NEVER commit this to git
- Generate different keys for dev/staging/production
- Store securely in environment variables
- Rotate periodically

**Testing:**

- Connect any OAuth integration
- Verify tokens are stored encrypted in database
- Test token decryption works

**Notes:**

- Required for any OAuth integrations
- Used by the encryption service
- Must be exactly 32 characters when base64 decoded

---

### 14. Sentry - Error Tracking

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Track errors and exceptions in production

**Sign up:** https://sentry.io

**Setup Steps:**

1. Create Sentry account
2. Create new project (Next.js)
3. Get DSN from project settings
4. Create auth token for releases

**Environment Variables:**

```bash
# From: https://sentry.io/settings/projects/
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# From: https://sentry.io/settings/account/api/auth-tokens/
SENTRY_AUTH_TOKEN=xxxxx
```

**Reference:** `env.example` lines 149-150

**Features Used:**

- Error tracking with context
- Performance monitoring
- Breadcrumbs for debugging
- Release tracking

**Testing:**

- Trigger test error
- Check error appears in Sentry
- Verify source maps work

**Pricing:**

- Free tier: 5,000 errors/month
- Paid plans for higher volume

**Notes:**

- Essential for production
- Set up release tracking
- Configure alerts

---

### 15. Logfire - Logging & Observability

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Why you need it:** Structured logging and observability

**Sign up:** Check Logfire or similar service

**Environment Variables:**

```bash
LOGFIRE_TOKEN=your_logfire_token
```

**Reference:** `env.example` lines 151

**Testing:**

- Check logs appear in dashboard
- Verify structured logging works
- Test log search and filtering

**Notes:**

- Optional but recommended for production
- Alternative: Use Sentry logs or CloudWatch
- Helps debug production issues

---

## 📋 Environment Variable Reference

Quick reference table of all environment variables:

| Variable                             | Service    | Priority       | Reference |
| ------------------------------------ | ---------- | -------------- | --------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase   | 🔴 Required    | Line 21   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase   | 🔴 Required    | Line 22   |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase   | 🔴 Required    | Line 23   |
| `SUPABASE_PROJECT_ID`                | Supabase   | 🔴 Required    | Line 24   |
| `OPENAI_API_KEY`                     | OpenAI     | 🔴 Required    | Line 30   |
| `OPENAI_ASSISTANT_ID`                | OpenAI     | 🔴 Required    | Line 34   |
| `STRIPE_SECRET_KEY`                  | Stripe     | 🔴 Required    | Line 65   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe     | 🔴 Required    | Line 66   |
| `STRIPE_CONNECT_CLIENT_ID`           | Stripe     | 🔴 Required    | Line 70   |
| `STRIPE_WEBHOOK_SECRET`              | Stripe     | 🔴 Required    | Line 74   |
| `VAPI_API_KEY`                       | VAPI       | 🟡 Recommended | Line 40   |
| `VAPI_PHONE_NUMBER_ID`               | VAPI       | 🟡 Recommended | Line 41   |
| `VAPI_WEBHOOK_SECRET`                | VAPI       | 🟡 Recommended | Line 42   |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY`        | VAPI       | 🟡 Recommended | Line 43   |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID`      | VAPI       | 🟡 Recommended | Line 44   |
| `GAMMA_API_KEY`                      | Gamma      | 🟡 Recommended | Line 50   |
| `CLOUDFLARE_ACCOUNT_ID`              | Cloudflare | 🟡 Recommended | Line 56   |
| `CLOUDFLARE_STREAM_API_TOKEN`        | Cloudflare | 🟡 Recommended | Line 57   |
| `SENDGRID_API_KEY`                   | SendGrid   | 🟡 Recommended | Line 129  |
| `SENDGRID_VERIFIED_SENDER_EMAIL`     | SendGrid   | 🟡 Recommended | Line 130  |
| `TWILIO_ACCOUNT_SID`                 | Twilio     | 🟡 Recommended | Line 136  |
| `TWILIO_AUTH_TOKEN`                  | Twilio     | 🟡 Recommended | Line 137  |
| `TWILIO_PHONE_NUMBER`                | Twilio     | 🟡 Recommended | Line 138  |
| `INTEGRATION_ENCRYPTION_KEY`         | Security   | 🟡 Recommended | Line 123  |
| `VERCEL_TOKEN`                       | Vercel     | 🟢 Optional    | Line 86   |
| `VERCEL_PROJECT_ID`                  | Vercel     | 🟢 Optional    | Line 87   |
| `GOOGLE_DRIVE_CLIENT_ID`             | Google     | 🟢 Optional    | Line 95   |
| `GOOGLE_DRIVE_CLIENT_SECRET`         | Google     | 🟢 Optional    | Line 96   |
| `GOOGLE_CLIENT_ID`                   | Google     | 🟢 Optional    | Line 115  |
| `GOOGLE_CLIENT_SECRET`               | Google     | 🟢 Optional    | Line 116  |
| `FACEBOOK_APP_ID`                    | Facebook   | 🟢 Optional    | Line 103  |
| `FACEBOOK_APP_SECRET`                | Facebook   | 🟢 Optional    | Line 104  |
| `INSTAGRAM_CLIENT_ID`                | Instagram  | 🟢 Optional    | Line 107  |
| `INSTAGRAM_CLIENT_SECRET`            | Instagram  | 🟢 Optional    | Line 108  |
| `TWITTER_CLIENT_ID`                  | Twitter    | 🟢 Optional    | Line 111  |
| `TWITTER_CLIENT_SECRET`              | Twitter    | 🟢 Optional    | Line 112  |
| `SENTRY_DSN`                         | Sentry     | 🟢 Optional    | Line 149  |
| `SENTRY_AUTH_TOKEN`                  | Sentry     | 🟢 Optional    | Line 150  |
| `LOGFIRE_TOKEN`                      | Logfire    | 🟢 Optional    | Line 151  |

---

## ✅ Setup Verification Checklist

Use this to verify each integration is working:

### Core Services

- [ ] Supabase: Can log in and see database tables
- [ ] OpenAI: Can generate funnel content
- [ ] Stripe: Can process test payment and Connect onboarding works

### Major Features

- [ ] VAPI: Can make test call and receive webhook
- [ ] Gamma: Can generate presentation deck
- [ ] Cloudflare: Can upload and stream video
- [ ] SendGrid: Can send test email
- [ ] Twilio: Can send test SMS

### Integrations

- [ ] Google Drive: Can select files
- [ ] Gmail: Can send email via OAuth
- [ ] Facebook: Can connect account
- [ ] Instagram: Can connect business account
- [ ] Twitter: Can post test tweet

### Security & Monitoring

- [ ] Encryption key: OAuth tokens are encrypted
- [ ] Sentry: Errors appear in dashboard
- [ ] Logfire: Logs appear in dashboard

---

## 🎯 Quick Start Script

Copy this to create your `.env.local` file:

```bash
# Copy the example file
cp env.example .env.local

# Generate encryption key
echo "INTEGRATION_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local

# Edit the file with your values
# nano .env.local
# or
# code .env.local
```

---

## 💰 Estimated Monthly Costs

Based on moderate usage (~1,000 users):

| Service           | Free Tier                  | Paid Cost                |
| ----------------- | -------------------------- | ------------------------ |
| Supabase          | 500MB DB, 2GB bandwidth    | $25/month Pro            |
| OpenAI            | No free tier               | $50-200/month            |
| Stripe            | Free (takes % of payments) | 2.9% + $0.30/transaction |
| VAPI              | Trial credits              | ~$100/month              |
| Gamma             | Limited free               | Check pricing            |
| Cloudflare Stream | $1 per 1,000 min           | ~$10-50/month            |
| SendGrid          | 100/day free               | $15/month                |
| Twilio            | Trial credits              | $1 + SMS costs           |
| Vercel            | Free hobby                 | $20/month Pro            |
| Sentry            | 5k errors/month            | $26/month                |
| **Total**         | **~$50/month min**         | **~$300-500/month**      |

_Costs vary significantly based on usage. Start with free tiers._

---

## 🆘 Troubleshooting

### "Missing environment variables" error

- Check `.env.local` exists and is not `.env.example`
- Verify variable names match exactly (case-sensitive)
- Restart dev server after adding variables

### Supabase connection fails

- Check URL includes `https://`
- Verify project is not paused
- Confirm anon key matches project

### OpenAI API errors

- Verify API key starts with `sk-`
- Check billing is set up
- Confirm usage limits not exceeded

### Stripe webhooks not working

- Use Stripe CLI for local testing
- Verify webhook secret matches endpoint
- Check webhook endpoint is publicly accessible

### OAuth redirects fail

- Verify redirect URI matches exactly
- Check OAuth app is not in development mode
- Confirm credentials are correct

---

## 📚 Additional Documentation

- `env.example` - Full environment variable reference
- `docs/STRIPE_SETUP.md` - Detailed Stripe setup guide
- `docs/CLAUDE_AUTH_SETUP.md` - OAuth integration details
- `README.md` - General project setup

---

## 📝 Notes Section

Use this space to track your own notes:

```
Service-specific notes:
-
-
-

Issues encountered:
-
-
-

Custom configurations:
-
-
-
```

---

**Last Updated:** 2025-10-31 **Next Review:** Before production deployment

Remember: Never commit `.env.local` to version control! 🔒
