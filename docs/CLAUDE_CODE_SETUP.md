# Claude Code GitHub App Setup

## Installation Steps

1. **Install the Claude Code GitHub App**
   - Visit: https://github.com/apps/claude-code/installations/new
   - Or go to: https://github.com/apps/claude-code
   - Click "Install" or "Configure"

2. **Select Repository Access**
   - Choose "Only select repositories"
   - Select "growth-mastery" repository
   - Click "Install"

3. **Grant Permissions** The app needs the following permissions:
   - ✅ **Repository permissions:**
     - Contents: Read
     - Issues: Write
     - Pull requests: Write
     - Metadata: Read (automatic)
   - ✅ **Account permissions:**
     - None required (unless you want Claude to manage issues across org)

4. **Get OAuth Token** After installation, you'll need to get an OAuth token:
   - Go to your repository settings
   - Navigate to: Settings → Secrets and variables → Actions
   - You'll need to add: `CLAUDE_CODE_OAUTH_TOKEN`

   **To get the token:**
   - The token is generated automatically when the app is installed
   - You may need to check the Claude Code App settings in your GitHub account
   - Or visit: https://github.com/settings/installations
   - Click on "Claude Code" installation
   - Look for OAuth token or API key section

5. **Add Secret to Repository**
   - Go to: https://github.com/Pixl8studio/growth-mastery/settings/secrets/actions
   - Click "New repository secret"
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: [Paste the OAuth token from step 4]
   - Click "Add secret"

## What These Workflows Do

### 1. Claude Code Review (`claude-code-review.yml`)

- **Triggers:** On PR open or update
- **Purpose:** Automatically reviews pull requests
- **What it does:**
  - Reviews code quality, architecture, performance, security
  - Checks TypeScript compliance, error handling
  - Validates Supabase patterns
  - Posts review comments on the PR

### 2. Claude Code (`claude.yml`)

- **Triggers:** When you mention `@claude` in:
  - Issue comments
  - PR comments
  - PR review comments
  - Issues (in title or body)
- **Purpose:** Interactive Claude assistant in GitHub
- **What it does:**
  - Responds to your questions and requests
  - Can read CI results
  - Can comment on PRs
  - Can help with code reviews

## Troubleshooting

If you get an error about Claude Code not being installed:

1. Verify the app is installed: https://github.com/settings/installations
2. Check it has access to the `growth-mastery` repository
3. Verify the `CLAUDE_CODE_OAUTH_TOKEN` secret exists in repository settings
4. Check workflow run logs for specific error messages

## Resources

- Claude Code App: https://github.com/apps/claude-code
- Documentation: https://github.com/anthropics/claude-code-action
- Installation page: https://github.com/apps/claude-code/installations/new
