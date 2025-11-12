# Vercel Deployment Troubleshooting Guide

## Repository Information

- **Repository**: `Pixl8studio/genie-v4`
- **Production Branch**: `main`
- **Latest Commit**: `8d09476` - "test: vercel deployment test with genie-v4 repository"

## Step-by-Step Troubleshooting

### 1. Verify GitHub Repository Access

**Check Repository Settings:**

1. Go to: https://github.com/Pixl8studio/genie-v4/settings
2. Navigate to **Settings → Integrations → Applications**
3. Look for **Vercel** in the list
4. Verify it has **Read and Write** access

**If Vercel is not listed:**

- You need to install the Vercel GitHub App
- Go to: https://github.com/apps/vercel
- Click **Configure** and grant access to `Pixl8studio/genie-v4`

### 2. Check GitHub Webhooks

**Verify Webhook is Installed:**

1. Go to: https://github.com/Pixl8studio/genie-v4/settings/hooks
2. Look for a webhook with URL: `https://api.vercel.com/v1/integrations/github/webhook`
3. Check if it's **Active** and shows recent deliveries

**If webhook is missing:**

- Vercel needs to reinstall webhooks
- Go to Vercel Dashboard → Project Settings → Git
- Disconnect and reconnect the repository

### 3. Verify Vercel Project Settings

**Check Repository Connection:**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Git**
4. Verify:
   - **Git Repository**: `Pixl8studio/genie-v4` (not the old name)
   - **Production Branch**: `main`
   - **Root Directory**: `/` (or correct path)
   - **Framework Preset**: `Next.js`

**Check Branch Settings:**

1. Go to **Settings → Git → Production Branch**
2. Should be set to: `main`
3. Verify **Auto-deploy from GitHub** is enabled

### 4. Verify GitHub App Permissions

**Check Vercel GitHub App Permissions:**

1. Go to: https://github.com/settings/installations
2. Find **Vercel** in the list
3. Click **Configure**
4. Verify:
   - **Repository access**: Should include `Pixl8studio/genie-v4`
   - **Permissions**: Should have:
     - Repository: Read and write
     - Contents: Read and write
     - Metadata: Read-only
     - Pull requests: Read and write

### 5. Check Repository Visibility

**If repository is private:**

- Vercel must have access to private repositories
- Verify your Vercel account/team has access to private repos
- Check: https://vercel.com/account/billing (verify plan includes private repos)

### 6. Test Webhook Manually

**Trigger a test deployment:**

1. Make a small commit (we've done this)
2. Push to `main` branch
3. Check Vercel Dashboard → Deployments
4. Should see a new deployment automatically

**If deployments don't appear:**

- Check GitHub webhook deliveries:
  https://github.com/Pixl8studio/genie-v4/settings/hooks
- Look for failed deliveries
- Check error messages in webhook delivery logs

### 7. Reconnect Repository in Vercel

**If webhooks are not working:**

1. Go to Vercel Dashboard → Project → Settings → Git
2. Click **Disconnect** (don't worry, this won't delete deployments)
3. Click **Connect Git Repository**
4. Select: `Pixl8studio/genie-v4`
5. Select branch: `main`
6. This will reinstall webhooks automatically

### 8. Verify Vercel Project ID

**Check if project is correctly linked:**

1. Go to Vercel Dashboard → Project → Settings → General
2. Note the **Project ID**
3. Verify it matches your expectations
4. Check **Git Repository** shows: `Pixl8studio/genie-v4`

## Common Issues and Solutions

### Issue: Webhooks not being received

**Solution**: Reconnect repository in Vercel (step 7)

### Issue: Vercel app doesn't have access

**Solution**: Install/configure Vercel GitHub App (step 1, 4)

### Issue: Wrong repository connected

**Solution**: Disconnect and reconnect to correct repository (step 7)

### Issue: Private repository access

**Solution**: Verify Vercel plan includes private repos (step 5)

### Issue: Wrong branch configured

**Solution**: Update production branch in Vercel settings (step 3)

## Testing the Fix

After completing the steps above:

1. Make a small commit to `main` branch
2. Push to GitHub: `git push origin main`
3. Wait 10-30 seconds
4. Check Vercel Dashboard → Deployments
5. Should see a new deployment automatically triggered

## Manual Deployment (Fallback)

If automatic deployments still don't work, you can deploy manually using Vercel CLI:

```bash
# Install Vercel CLI (already done)
pnpm add -D vercel

# Login to Vercel
npx vercel login

# Link project
npx vercel link

# Deploy
npx vercel --prod
```

However, the goal is to get automatic deployments working so you don't need to do this
manually.

## Next Steps

1. Complete steps 1-7 above
2. Make a test commit and push
3. Verify deployment appears in Vercel Dashboard
4. If still not working, check webhook delivery logs in GitHub

## Support

If issues persist:

- Check Vercel status: https://vercel-status.com
- Check GitHub status: https://www.githubstatus.com
- Review Vercel logs: Dashboard → Project → Deployments → Select deployment → Logs
- Review GitHub webhook deliveries: Repository → Settings → Webhooks → Select webhook →
  Recent Deliveries
