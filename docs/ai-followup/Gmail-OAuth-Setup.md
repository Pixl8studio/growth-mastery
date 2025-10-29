# Gmail OAuth Setup Guide

Complete guide for enabling Gmail OAuth in the AI Follow-Up Engine so users can send
follow-up emails through their own Gmail accounts without DNS configuration.

## Overview

Gmail OAuth allows users to send follow-up emails through their personal or Google
Workspace Gmail accounts. This provides:

- **Instant setup** - No DNS configuration required
- **Gmail deliverability** - Uses Gmail's excellent email reputation
- **Simple authentication** - One-click OAuth connection
- **Reasonable limits** - 500 emails/day (personal Gmail) or 2,000/day (Google
  Workspace)

## Prerequisites

- Google Cloud Console project
- Access to configure OAuth consent screen
- Application running with proper redirect URI configuration

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to **APIs & Services → Library**
   - Search for "Gmail API"
   - Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** user type (or Internal for Workspace)
3. Fill in application information:
   - **App name**: Your application name (e.g., "Genie AI")
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add authorized domains:
   - Add your application domain (e.g., `yourdomain.com`)
5. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send` - Send emails
   - `https://www.googleapis.com/auth/userinfo.email` - Get email address
   - `https://www.googleapis.com/auth/userinfo.profile` - Get profile
6. Add test users (if in testing mode):
   - Add email addresses that can test the OAuth flow
   - Required until app is verified by Google
7. Save and continue

### 3. Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Select application type: **Web application**
4. Configure:
   - **Name**: "Genie AI Web Client" (or your preference)
   - **Authorized JavaScript origins**: Add your app URL
     - `https://yourdomain.com` (production)
     - `http://localhost:3000` (development)
   - **Authorized redirect URIs**: Add callback URL
     - `https://yourdomain.com/api/followup/gmail/callback` (production)
     - `http://localhost:3000/api/followup/gmail/callback` (development)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

Add these to your `.env.local` (development) or production environment:

```bash
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=https://yourdomain.com/api/followup/gmail/callback
```

For development:

```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/followup/gmail/callback
```

### 5. Run Database Migration

The migration adds required columns to store OAuth tokens:

```bash
# Supabase migration is at:
# supabase/migrations/20250129000004_add_gmail_oauth_to_agent_configs.sql

# If using Supabase CLI:
supabase db push

# Or apply manually through Supabase dashboard → SQL Editor
```

### 6. Restart Application

Restart your application to load the new environment variables:

```bash
# Development
npm run dev

# Production - depends on hosting platform
# Restart via your hosting provider's dashboard
```

## User Flow

### Connecting Gmail

1. User navigates to **Step 11: AI Follow-Up Engine → Sender Setup** tab
2. Clicks **Connect Gmail** button
3. OAuth popup opens to Google's authorization page
4. User selects Gmail account and grants permissions:
   - Send emails on your behalf
   - View email address
   - View basic profile information
5. Popup closes and user returns to app
6. Gmail is now connected and ready to send emails

### Disconnecting Gmail

1. User clicks **Disconnect Gmail** button
2. Confirms the action
3. OAuth tokens are removed
4. System reverts to SendGrid provider (requires domain verification)

## Technical Details

### OAuth Flow

1. **Initiation**:
   - GET `/api/followup/gmail/connect?agent_config_id=<id>`
   - Generates OAuth URL with state parameter
   - Returns URL to open in popup

2. **Authorization**:
   - User authorizes in Google's OAuth page
   - Google redirects to callback URL with authorization code

3. **Token Exchange**:
   - GET `/api/followup/gmail/callback?code=<code>&state=<state>`
   - Exchanges authorization code for access + refresh tokens
   - Stores tokens in database
   - Updates agent config to use Gmail provider

4. **Token Refresh**:
   - Access tokens expire after 1 hour
   - System automatically refreshes using refresh token before expiry
   - Transparent to user

### Email Sending

When Gmail is connected:

1. System detects `email_provider_type = 'gmail'` in agent config
2. Loads `GmailEmailProvider` instead of SendGrid
3. Gets valid access token (refreshes if needed)
4. Creates RFC 2822 formatted email
5. Sends via Gmail API: `POST /gmail/v1/users/me/messages/send`
6. Returns success with Gmail message ID

### Security Considerations

**Token Storage**:

- Access tokens stored in database
- Refresh tokens stored for automatic renewal
- Consider encryption at rest for production

**Scope Permissions**:

- `gmail.send` - Only allows sending, not reading emails
- Minimal permissions following principle of least privilege

**State Parameter**:

- Includes `agentConfigId` and `userId`
- Base64 encoded for validation
- Prevents CSRF attacks

## Sending Limits

### Gmail Personal Account

- **500 emails per day**
- Rolling 24-hour window
- Limit applies across all applications
- Exceeding limit temporarily blocks sending

### Google Workspace Account

- **2,000 emails per day**
- Higher limit for business accounts
- Can request increase from Google

### Best Practices

- Monitor daily send count
- Space out emails to avoid hitting limits
- Inform users of remaining quota
- Provide SendGrid fallback option

## Troubleshooting

### "OAuth client not configured"

**Cause**: Missing or invalid Google Client ID/Secret

**Solution**:

1. Verify environment variables are set correctly
2. Check Client ID starts with your project ID
3. Ensure Client Secret matches the one from Google Console
4. Restart application after changing environment variables

### "Redirect URI mismatch"

**Cause**: Callback URL doesn't match authorized redirect URI in Google Console

**Solution**:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add exact redirect URI used by your app
4. Match protocol (http vs https), domain, and path exactly

### "Access denied" or "invalid_grant"

**Cause**: User denied access or tokens expired

**Solution**:

1. Have user reconnect Gmail
2. Ensure refresh token is stored correctly
3. Check token expiration handling logic

### Gmail API errors

**429 Too Many Requests**: Hit rate limit

- Space out email sending
- Implement exponential backoff

**403 Forbidden**: Insufficient permissions

- Check OAuth scopes include `gmail.send`
- Re-authorize to get correct scopes

**401 Unauthorized**: Token expired or invalid

- Trigger token refresh
- Worst case: have user reconnect

## Comparison: Gmail OAuth vs SendGrid

| Feature            | Gmail OAuth                | SendGrid                      |
| ------------------ | -------------------------- | ----------------------------- |
| **Setup Time**     | Instant (1 click)          | 24-48 hours (DNS propagation) |
| **DNS Required**   | No                         | Yes (SPF, DKIM, DMARC)        |
| **Deliverability** | Gmail reputation           | Your domain reputation        |
| **Sending Limit**  | 500/day or 2,000/day       | Based on plan                 |
| **Email Address**  | user@gmail.com             | you@yourdomain.com            |
| **Best For**       | Quick start, testing       | Professional, high volume     |
| **Cost**           | Free (uses existing Gmail) | Paid plans for volume         |

## Recommendation

**For Getting Started**: Use Gmail OAuth

- No configuration required
- Start sending emails immediately
- Test follow-up sequences

**For Production**: Use SendGrid

- Professional branded emails
- Higher sending limits
- Better control and analytics
- Required for high-volume sending

**Hybrid Approach**: Offer both options

- Gmail for quick start and low-volume users
- SendGrid for professional users and scale
- Let users choose based on their needs

---

## Support

For additional help:

- Check Google's
  [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- Review [Gmail API Documentation](https://developers.google.com/gmail/api)
- Test OAuth flow with [OAuth Playground](https://developers.google.com/oauthplayground)

**Last Updated**: January 29, 2025 | **Version**: 1.0
