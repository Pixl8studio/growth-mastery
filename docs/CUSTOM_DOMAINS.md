# Custom Domains Setup Guide

Connect your own domain to your funnel projects for a fully branded experience.

## Overview

Custom domain support allows you to point your own domain or subdomain to a specific
funnel project. Visitors will see your content at your branded domain with automatic SSL
encryption.

**Supported domain types:**

- Root domains (e.g., `company.com`)
- Subdomains (e.g., `webinar.company.com`)

## Prerequisites

Before adding a custom domain, you need:

1. A funnel project created in Genie AI
2. Access to your domain's DNS settings (through your domain registrar or DNS provider)
3. Your domain must be registered and active

## Setup Process

### Step 1: Add Domain in Genie AI

1. Navigate to **Settings → Domains**
2. Click **Add New Domain**
3. Enter your domain (e.g., `webinar.yourcompany.com`)
4. Select which funnel project to connect it to
5. Click **Add Domain**

### Step 2: Configure DNS

After adding your domain, you'll receive DNS configuration instructions. You need to add
a CNAME record:

```
Type: CNAME
Name: webinar.yourcompany.com (or @ for root domain)
Value: cname.vercel-dns.com
TTL: Auto or 3600
```

#### Where to Add DNS Records

DNS settings are typically found in:

- **GoDaddy**: Domain Settings → DNS Management
- **Namecheap**: Domain List → Manage → Advanced DNS
- **Cloudflare**: Dashboard → DNS
- **Google Domains**: My Domains → DNS

#### Root Domain Setup

For root domains (e.g., `company.com`), you may need to:

1. Use an ALIAS or ANAME record instead of CNAME (if your DNS provider supports it)
2. Or use a subdomain like `www.company.com` instead

### Step 3: Verify Domain

1. After adding the DNS record, wait 5-10 minutes for propagation
2. Return to **Settings → Domains**
3. Click **Check Verification Status**
4. Once verified, your domain will show as "Verified" with a green badge

### Step 4: Test Your Domain

Visit your custom domain in a browser. You should see your funnel project's pages.

SSL certificates are automatically provisioned by Vercel and may take a few additional
minutes after verification.

## DNS Propagation

DNS changes can take time to propagate:

- **Typical**: 5-15 minutes
- **Maximum**: Up to 48 hours (rare)

Use [DNS Checker](https://dnschecker.org) to verify your DNS records have propagated
globally.

## Troubleshooting

### Domain Won't Verify

**Check these common issues:**

1. **DNS record not set correctly**
   - Verify the CNAME value is exactly `cname.vercel-dns.com`
   - Ensure there are no trailing dots or extra spaces
   - Check that you're editing the correct domain

2. **Propagation delay**
   - Wait at least 10-15 minutes after adding DNS record
   - Clear your DNS cache: `ipconfig /flushdns` (Windows) or
     `sudo dscacheutil -flushcache` (Mac)

3. **Conflicting records**
   - Remove any existing A records for the same subdomain
   - Only one CNAME record should exist per subdomain

4. **Root domain issues**
   - Some DNS providers don't support CNAME for root domains
   - Use a subdomain (www) or check if your provider supports ALIAS/ANAME records

### SSL Certificate Issues

If you see SSL warnings:

- Wait 10-15 minutes after verification completes
- Vercel automatically provisions SSL certificates
- Certificates can take additional time to activate

### Pages Not Loading

If your domain verifies but pages don't load:

1. Check that your funnel project has published pages
2. Verify the correct project is linked to the domain
3. Try visiting specific page URLs (e.g., `yourdomain.com/page-slug`)

## Getting Vercel API Credentials

For administrators setting up the platform:

### 1. Create Vercel Access Token

1. Log in to [Vercel](https://vercel.com)
2. Go to **Settings → Tokens**
3. Click **Create Token**
4. Name it "Genie AI Domains"
5. Set scope to appropriate project access
6. Copy the token (you won't see it again)

### 2. Get Project ID

1. Go to your Vercel project dashboard
2. Click **Settings → General**
3. Copy the **Project ID**

### 3. Get Team ID (if applicable)

If your project is under a team:

1. Go to **Settings → General**
2. Find **Team ID** in the project settings
3. Copy the team ID

### 4. Add to Environment Variables

Add these to your `.env.local`:

```bash
VERCEL_TOKEN=your_access_token_here
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxx
VERCEL_TEAM_ID=team_xxxxxxxxxxxxx  # Optional
```

## Limitations

- **Verification required**: Domains must be verified before they're live
- **One project per domain**: Each domain can only point to one funnel project
- **DNS access required**: Users must have access to modify DNS records
- **Propagation time**: DNS changes are not instant

## Best Practices

1. **Use subdomains** for easier setup (e.g., `webinar.company.com`)
2. **Verify DNS first** before announcing the domain to customers
3. **Test thoroughly** after setup to ensure all pages load correctly
4. **Keep DNS simple** - avoid multiple CNAME chains
5. **Document your setup** for future reference

## Support

If you continue to have issues:

1. Verify your DNS settings at [DNS Checker](https://dnschecker.org)
2. Check Vercel's status page for any platform issues
3. Review your domain registrar's documentation for DNS setup
4. Contact support with your domain name and error details

## Additional Resources

- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/domains)
- [Understanding DNS Records](https://www.cloudflare.com/learning/dns/dns-records/)
- [DNS Propagation Checker](https://dnschecker.org)
