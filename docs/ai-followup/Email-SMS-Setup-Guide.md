# Email & SMS Setup Guide

Complete guide for configuring SendGrid email authentication and Twilio SMS for the AI
Follow-Up Engine.

## Overview

The AI Follow-Up Engine requires verified email sending and SMS capabilities to deliver
automated follow-up messages to your prospects. This guide walks you through the
complete setup process.

## Prerequisites

- SendGrid account (free tier available)
- Twilio account (for SMS, optional)
- Access to your domain's DNS settings
- Admin access to your Genie AI dashboard

---

## Part 1: SendGrid Email Setup

### Step 1: Create SendGrid Account

1. Visit [SendGrid.com](https://sendgrid.com)
2. Sign up for a free account (40,000 emails for 30 days, then 100/day forever)
3. Complete email verification
4. Verify your account identity (required for sending)

### Step 2: Get SendGrid API Key

1. Log in to SendGrid
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Name it "Genie AI Follow-Up Engine"
5. Select **Restricted Access**
6. Enable the following permissions:
   - **Mail Send**: Full Access
   - **Domain Authentication**: Full Access
   - **Sender Authentication**: Full Access
7. Click **Create & View**
8. **Copy the API key immediately** (you won't see it again)
9. Add to your `.env.local` file:

```bash
SENDGRID_API_KEY=SG.your_api_key_here
```

### Step 3: Domain Authentication (DNS Setup)

Domain authentication proves you own your sending domain and dramatically improves
deliverability.

#### In SendGrid:

1. Navigate to **Settings → Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select your DNS host (GoDaddy, Cloudflare, etc.)
4. Enter your domain (e.g., `yourdomain.com`)
5. Use subdomain `em` (recommended for email)
6. Enable **Automated Security**
7. Click **Next**

SendGrid will generate 3 DNS records you need to add.

#### In Your DNS Provider:

You'll need to add three CNAME records. SendGrid provides the exact values:

**Record 1: Mail CNAME**

```
Type: CNAME
Host: em.yourdomain.com
Value: u1234567.wl123.sendgrid.net
```

**Record 2: DKIM Record 1**

```
Type: CNAME
Host: s1._domainkey.yourdomain.com
Value: s1.domainkey.u1234567.wl123.sendgrid.net
```

**Record 3: DKIM Record 2**

```
Type: CNAME
Host: s2._domainkey.yourdomain.com
Value: s2.domainkey.u1234567.wl123.sendgrid.net
```

**Important Notes:**

- Replace `yourdomain.com` with your actual domain
- SendGrid provides your specific values (u1234567 will be different)
- DNS changes take 24-48 hours to propagate fully
- Most providers propagate faster (30 minutes to 2 hours)

#### Verify Domain Authentication:

1. After adding DNS records, return to SendGrid
2. Click **Verify** on the authentication page
3. If verification fails, wait 30 minutes and try again
4. Once verified, you'll see a green checkmark ✅

### Step 4: Configure Sender Identity in Genie AI

1. Go to your funnel project in Genie AI
2. Navigate to **Step 11: AI Follow-Up Engine**
3. Click the **Sender Setup** tab
4. Fill in your sender information:
   - **From Name**: Your name or company name (e.g., "Sarah from Acme Corp")
   - **From Email**: Your verified email (e.g., "followup@yourdomain.com")
   - **SMS Sender ID**: (optional) For SMS sending
5. Click **Verify Domain**
6. System will check SendGrid and display verification status
7. If verified, you'll see ✅ **Domain Verified**
8. Save your configuration

---

## Part 2: SPF, DKIM, and DMARC Explained

### What Are These Records?

**SPF (Sender Policy Framework)**

- Specifies which mail servers can send email from your domain
- Prevents spammers from forging your domain
- SendGrid's CNAME records automatically configure SPF

**DKIM (DomainKeys Identified Mail)**

- Adds a digital signature to your emails
- Proves emails weren't tampered with in transit
- SendGrid provides two DKIM records for redundancy

**DMARC (Domain-based Message Authentication)**

- Policy that tells email providers what to do with emails that fail SPF/DKIM
- Optional but recommended for better deliverability

### Adding DMARC (Optional but Recommended)

Add this TXT record to your DNS:

```
Type: TXT
Host: _dmarc.yourdomain.com
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

This tells email providers to:

- `p=none`: Accept emails but report failures
- `rua=mailto:...`: Send reports to this email

Start with `p=none` to monitor. After 1-2 weeks of clean reports, you can tighten to
`p=quarantine` or `p=reject`.

---

## Part 3: Twilio SMS Setup (Optional)

### Step 1: Create Twilio Account

1. Visit [Twilio.com](https://www.twilio.com)
2. Sign up for a free trial ($15 credit)
3. Verify your phone number
4. Complete account setup

### Step 2: Get Phone Number

1. Navigate to **Phone Numbers → Manage → Buy a Number**
2. Select your country
3. Choose capabilities: **SMS** (and Voice if desired)
4. Purchase a number ($1/month typically)
5. Note your phone number (e.g., +15551234567)

### Step 3: Get API Credentials

1. Go to Dashboard → Account Info
2. Note your:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click to reveal)
3. Add to `.env.local`:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### Step 4: Configure SMS in Genie AI

1. In Step 11: AI Follow-Up Engine
2. Go to **Agent Configuration → Channels**
3. Enable **SMS**
4. Set **SMS Sender ID** to your Twilio phone number
5. Configure sending limits:
   - **Max SMS per day**: 2 (recommended)
   - **Requires High Intent**: ON (only send to highly engaged prospects)
6. Save configuration

---

## Part 4: Testing Your Setup

### Test Email Sending

1. In Step 11, click **Test Message to Self** button
2. Select **Email**
3. System sends a test email to your account email
4. Check inbox (and spam folder)
5. Verify:
   - Email arrives
   - From name displays correctly
   - No "via sendgrid.net" warning
   - Email is not in spam

### Test SMS Sending (if configured)

1. Click **Test Message to Self** button
2. Select **SMS**
3. Enter your phone number
4. System sends a test SMS
5. Verify:
   - SMS arrives within 1-2 minutes
   - Sender shows your configured number
   - Message is readable and formatted correctly

---

## Part 5: Troubleshooting

### Domain Verification Fails

**Issue**: SendGrid can't verify your domain

**Solutions**:

1. Wait 24-48 hours for DNS propagation
2. Check DNS records are exact matches (no typos)
3. Remove any trailing dots from DNS values
4. Use [DNS Checker](https://dnschecker.org) to verify propagation
5. Clear your DNS cache: `ipconfig /flushdns` (Windows) or
   `sudo dscacheutil -flushcache` (Mac)

### Emails Going to Spam

**Issue**: Follow-up emails land in spam folder

**Solutions**:

1. Ensure domain authentication is verified (✅ green checkmark)
2. Add DMARC record (see Part 2)
3. Warm up your domain:
   - Start with small batches (10-20 emails/day)
   - Gradually increase over 2 weeks
4. Improve email content:
   - Avoid spam trigger words ("FREE", "LIMITED TIME")
   - Balance text/image ratio
   - Include physical address in footer
   - Make unsubscribe link prominent
5. Check SendGrid reputation dashboard
6. Authenticate additional domains if sending high volume

### SMS Not Sending

**Issue**: SMS messages fail to send

**Solutions**:

1. Verify Twilio account is active (not trial expired)
2. Check phone number format: +1234567890 (include country code)
3. Verify phone number is SMS-capable
4. Check Twilio balance (trial credit or paid account)
5. Review Twilio debugger for error messages
6. Ensure SMS is enabled in Channel Configuration
7. For US numbers, register your use case with Twilio (A2P 10DLC)

### "Quiet Hours" Blocking Sends

**Issue**: Messages not sending during certain hours

**Solution**: This is intentional! The system respects quiet hours (22:00-07:00 local
time) to avoid annoying prospects. Messages automatically reschedule to 09:00 local
time.

To adjust quiet hours:

1. Go to Agent Configuration → Advanced
2. Modify `compliance_config`:
   - `quiet_hours_start`: "22:00"
   - `quiet_hours_end`: "07:00"
3. Save configuration

---

## Part 6: Best Practices

### Email Deliverability

1. **Warm up your domain**: Start slow, increase gradually
2. **Monitor engagement**: Low open rates hurt future deliverability
3. **Clean your list**: Remove bounces and complainers immediately
4. **Personalize content**: Use prospect data in messages
5. **Mobile-optimize**: 60%+ opens are on mobile
6. **Test spam score**: Use [Mail-Tester.com](https://www.mail-tester.com)

### SMS Compliance

1. **Get consent**: Only send to opted-in prospects
2. **Include opt-out**: "Reply STOP to unsubscribe"
3. **Keep it short**: Under 160 characters when possible
4. **Timing matters**: 9 AM - 8 PM local time only
5. **Add value**: Every message should be relevant
6. **Respect opt-outs**: Immediately honor STOP requests

### Sending Limits

**SendGrid Free Tier**:

- 100 emails/day after first 30 days
- Upgrade for higher volume

**Twilio Trial**:

- $15 credit (~500 SMS)
- Numbers verified manually only
- Upgrade to remove restrictions

**Recommended Limits**:

- Email: Max 3 per prospect per day
- SMS: Max 1 per prospect per day
- Total sequence: 5 messages over 3 days

---

## Part 7: Advanced Configuration

### Custom Subdomain

Instead of `em.yourdomain.com`, use `mail.yourdomain.com` or `email.yourdomain.com`:

1. In SendGrid domain authentication, enter your preferred subdomain
2. Add all CNAME records with your chosen subdomain
3. Verify as normal

### Multiple Domains

To send from multiple domains (e.g., different brands):

1. Authenticate each domain in SendGrid
2. Create separate agent configurations per domain
3. Configure sender email for each agent

### Dedicated IP Address

For high-volume senders (10,000+ emails/month):

1. Purchase dedicated IP from SendGrid ($90/month)
2. Warm up the IP over 4-6 weeks
3. Better reputation control and deliverability

---

## Part 8: Monitoring & Maintenance

### SendGrid Dashboard

Monitor daily:

- **Delivery Rate**: Should be >95%
- **Open Rate**: Aim for >20%
- **Click Rate**: Aim for >2%
- **Bounce Rate**: Keep <2%
- **Spam Report Rate**: Keep <0.1%

### Genie AI Analytics

Track in Step 11:

- Messages sent/delivered/opened
- Conversion rates by segment
- Revenue generated from follow-up
- Engagement trends over time

### Regular Maintenance

**Weekly**:

- Review delivery rates
- Check spam complaints
- Update suppression list

**Monthly**:

- Audit message templates
- A/B test subject lines
- Refine segmentation rules
- Review and update DNS records (if domain changes)

---

## Support Resources

**SendGrid**:

- Documentation: https://docs.sendgrid.com
- Support: https://support.sendgrid.com
- Status: https://status.sendgrid.com

**Twilio**:

- Documentation: https://www.twilio.com/docs
- Support: https://support.twilio.com
- Console: https://console.twilio.com

**Genie AI**:

- Dashboard: Navigate to Step 11 in your funnel
- Check verification status: Sender Setup tab
- Test sends: Use "Test Message to Self" button

---

## Quick Reference

### Required Environment Variables

```bash
# SendGrid (Required for Email)
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_VERIFIED_SENDER_EMAIL=followup@yourdomain.com

# Twilio (Optional for SMS)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Follow-Up Configuration
FOLLOWUP_FROM_EMAIL=followup@yourdomain.com
FOLLOWUP_FROM_NAME="Your Name"
```

### DNS Records Checklist

- [ ] Mail CNAME (em.yourdomain.com)
- [ ] DKIM Record 1 (s1.\_domainkey)
- [ ] DKIM Record 2 (s2.\_domainkey)
- [ ] DMARC TXT Record (optional but recommended)

### Pre-Launch Checklist

- [ ] SendGrid API key configured
- [ ] Domain authenticated and verified
- [ ] DNS records propagated (check with dnschecker.org)
- [ ] Sender identity configured in Genie AI
- [ ] Test email sent successfully
- [ ] Test SMS sent successfully (if using)
- [ ] Agent configuration saved
- [ ] Default sequences reviewed
- [ ] Compliance settings configured
- [ ] Analytics dashboard accessible

---

**Last Updated**: January 29, 2025 **Version**: 1.0

For additional help, contact support or consult the SendGrid/Twilio documentation linked
above.
