# Stripe Connect Setup Guide

Complete guide to setting up Stripe Connect for payment processing and platform fees.

## Overview

Genie AI uses Stripe Connect to enable users to accept payments through their own Stripe
accounts while automatically deducting platform fees. This guide walks you through the
complete setup process.

## Platform Fee Structure

The platform takes a commission on all sales:

- **Percentage**: 20% of sale price
- **Fixed Fee**: $0.50 per transaction

**Example**: $997 sale

- Platform fee: $199.40 + $0.50 = $199.90
- Seller receives: $797.10 (minus Stripe's processing fees)

You can customize these fees with environment variables:

- `STRIPE_PLATFORM_FEE_PERCENT` - Percentage (default: 20)
- `STRIPE_PLATFORM_FEE_FIXED` - Fixed fee in cents (default: 50)

## Prerequisites

1. A Stripe account - Sign up at https://stripe.com if you don't have one
2. Access to your Stripe Dashboard
3. Your application deployed or running locally

## Step 1: Get Your API Keys

### Test Mode Keys (Development)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Find your **Publishable key** (starts with `pk_test_`)
3. Click **Reveal test key** to get your **Secret key** (starts with `sk_test_`)
4. Add to your environment:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Live Mode Keys (Production)

1. Switch to **Live mode** in Stripe Dashboard (toggle in top right)
2. Go to https://dashboard.stripe.com/apikeys
3. Get your live keys (starts with `pk_live_` and `sk_live_`)
4. Use these for production environment

## Step 2: Set Up Stripe Connect

Stripe Connect allows users to connect their Stripe accounts to your platform.

### Create Your Connect Application

1. Go to https://dashboard.stripe.com/settings/applications
2. Click **Settings** in the Connect section
3. Fill in your application details:
   - **Name**: Your platform name (e.g., "Genie AI")
   - **Brand icon**: Upload your logo
   - **Brand color**: Your primary color

### Configure OAuth Settings

1. Scroll to **OAuth settings** section
2. Add your redirect URI:
   - **Development**: `http://localhost:3000/api/stripe/callback`
   - **Production**: `https://yourdomain.com/api/stripe/callback`
3. Click **Add URI** for each environment

### Get Your Connect Client ID

1. Stay on the Connect settings page
2. Look for **Client ID** section at the top
3. Copy your Client ID (starts with `ca_`)
4. Add to your environment:
   ```bash
   STRIPE_CONNECT_CLIENT_ID=ca_...
   ```

**This is required** - Without this, users cannot connect their Stripe accounts.

## Step 3: Set Up Webhooks

Webhooks notify your application when payments succeed, fail, or get refunded.

### Create Webhook Endpoint

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - **Development**: `http://localhost:3000/api/stripe/webhook` (use ngrok for local
     testing)
   - **Production**: `https://yourdomain.com/api/stripe/webhook`

### Select Events

Select these events to listen for:

- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed
- `account.updated` - Connected account status changed

### Get Webhook Secret

1. After creating the endpoint, click to view it
2. Click **Reveal** under **Signing secret**
3. Copy the secret (starts with `whsec_`)
4. Add to your environment:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 4: Configure Environment Variables

Create `.env.local` from the template:

```bash
cp env.example .env.local
```

Fill in all Stripe variables:

```bash
# Required - API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Required - Connect
STRIPE_CONNECT_CLIENT_ID=ca_...

# Required - Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional - Platform Fees (defaults shown)
STRIPE_PLATFORM_FEE_PERCENT=20
STRIPE_PLATFORM_FEE_FIXED=50
```

## Step 5: Test the Integration

### Test User Connection Flow

1. Start your development server:

   ```bash
   pnpm dev
   ```

2. Log in to your application
3. Go to Settings > Payments
4. Click **Connect Stripe Account**
5. Complete the OAuth flow
6. Verify connection shows as successful

### Test Payment Processing

1. Create a test funnel with an enrollment page
2. Set a test price (use Stripe test card: `4242 4242 4242 4242`)
3. Complete a test purchase
4. Verify in Stripe Dashboard:
   - Payment appears in **Payments** tab
   - Platform fee was deducted
   - Connected account received correct amount

### Test Webhooks

1. Make a test payment
2. Check your application logs for webhook events
3. Verify payment status updates in database
4. Check Stripe Dashboard > Webhooks for delivery status

## Production Deployment

### Switch to Live Mode

1. Get live API keys from Stripe Dashboard (live mode)
2. Create new Connect application settings for production domain
3. Set up production webhook endpoint
4. Update environment variables in production:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_CONNECT_CLIENT_ID=ca_... (live mode ID)
   STRIPE_WEBHOOK_SECRET=whsec_... (production webhook)
   ```

### Important Production Notes

- Test the full flow in test mode before going live
- Verify webhook endpoints are publicly accessible
- Monitor webhook delivery in Stripe Dashboard
- Set up proper error monitoring (Sentry)
- Review Stripe's production checklist:
  https://stripe.com/docs/connect/production-checklist

## Troubleshooting

### "Stripe Connect is not configured" Error

**Cause**: `STRIPE_CONNECT_CLIENT_ID` is missing or empty.

**Solution**:

1. Get your Client ID from https://dashboard.stripe.com/settings/applications
2. Add it to `.env.local`
3. Restart your development server

### 400 Bad Request on OAuth

**Cause**: Invalid Client ID or incorrect redirect URI.

**Solution**:

1. Verify Client ID starts with `ca_`
2. Check redirect URI matches exactly in Stripe Connect settings
3. Ensure no trailing slashes in URLs

### Webhook Delivery Failing

**Cause**: Endpoint not accessible or incorrect signing secret.

**Solution**:

1. Use ngrok for local testing: `ngrok http 3000`
2. Update webhook endpoint URL to ngrok URL
3. Verify webhook secret matches environment variable
4. Check webhook logs in Stripe Dashboard

### Platform Fee Not Applied

**Cause**: Connected account ID not stored or environment variables not set.

**Solution**:

1. Verify user completed Connect OAuth flow
2. Check database for `stripe_account_id` in user profile
3. Verify `STRIPE_PLATFORM_FEE_PERCENT` and `STRIPE_PLATFORM_FEE_FIXED` are set
4. Check payment intent creation logs

## Local Development with ngrok

For testing webhooks locally:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start tunnel
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update webhook endpoint in Stripe Dashboard to:
# https://abc123.ngrok.io/api/stripe/webhook
```

## Security Checklist

- ✅ Never commit `.env.local` to version control
- ✅ Use test mode keys for development
- ✅ Use live mode keys only in production
- ✅ Verify webhook signatures (automatically handled)
- ✅ Use HTTPS in production
- ✅ Rotate keys if compromised
- ✅ Monitor failed webhook deliveries

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [OAuth Documentation](https://stripe.com/docs/connect/oauth-reference)
- [Webhook Documentation](https://stripe.com/docs/webhooks)
- [Testing Guide](https://stripe.com/docs/testing)
- [Production Checklist](https://stripe.com/docs/connect/production-checklist)

## Support

If you run into issues:

1. Check Stripe Dashboard logs
2. Review application logs for errors
3. Verify all environment variables are set
4. Test in Stripe's test mode first
5. Consult Stripe's documentation

---

Built with precision and deductive reasoning. 🔍
