# 🐛 Cursor Bugbot Setup Guide

## 🎯 What is Cursor Bugbot?

Cursor Bugbot is an AI-powered code reviewer that automatically reviews your pull
requests on GitHub, providing:

- 🔍 Bug detection and analysis
- 💡 Fix suggestions with explanations
- ✨ Code quality improvements
- 🔐 Security issue identification
- 📚 Best practice recommendations

## ✅ Setup Steps

### Step 1: Install the Bugbot GitHub App

1. **Visit the GitHub App page:**
   - Go to: https://github.com/apps/cursor-bugbot

2. **Install the app:**
   - Click the **"Install"** button
   - Choose which repositories to enable Bugbot on:
     - Select **"Only select repositories"**
     - Choose: `genie-ai-new/genie-ai` (or your repository name)
     - Or select **"All repositories"** for organization-wide coverage

3. **Authorize the app:**
   - Review the permissions Bugbot needs:
     - Read access to code
     - Read and write access to pull requests
     - Read access to issues
   - Click **"Install & Authorize"**

### Step 2: Configure Bugbot in Cursor Dashboard

1. **Open Cursor Dashboard:**
   - Visit: https://cursor.com/dashboard
   - Sign in with your Cursor account

2. **Navigate to Bugbot settings:**
   - Click on the **"Bugbot"** tab in the sidebar

3. **Connect GitHub:**
   - Click **"Connect GitHub"** (or **"Manage Connections"** if already connected)
   - Follow the OAuth flow to authorize Cursor
   - Return to the dashboard

4. **Enable Bugbot on repositories:**
   - Select the repositories you want Bugbot to monitor
   - Toggle Bugbot **ON** for `genie-ai-new/genie-ai`
   - Configure review settings (automatic vs. manual trigger)

### Step 3: Verify Installation

#### Check GitHub App Installation

```bash
# Using GitHub CLI
gh api /repos/OWNER/REPO/installation
```

#### Create a Test PR

1. Create a new branch with a simple change
2. Open a pull request
3. Wait for Bugbot to automatically review (usually within 1-2 minutes)
4. Look for Bugbot's comment on the PR

## 🚀 Using Cursor Bugbot

### Automatic Reviews

Once enabled, Bugbot automatically reviews:

- ✅ New pull requests
- ✅ Pull requests when new commits are pushed
- ✅ Draft PRs (if configured)

### Manual Triggers

You can manually trigger Bugbot by commenting on a PR:

```
cursor review
```

Or with verbose mode for debugging:

```
cursor review verbose=true
```

Alternative command:

```
bugbot run
```

### Bugbot Commands

| Command                      | Description                      |
| ---------------------------- | -------------------------------- |
| `cursor review`              | Trigger a standard review        |
| `cursor review verbose=true` | Get detailed logs and request ID |
| `bugbot run`                 | Alternative trigger command      |
| `bugbot run verbose=true`    | Verbose mode alternative         |

## 🔍 What Bugbot Checks

### Code Quality

- 🎨 Code style and formatting
- 📏 Code complexity and readability
- 🔄 Duplicate code detection
- 📦 Unused imports and variables

### Security

- 🔐 Security vulnerabilities
- 🔑 Hardcoded secrets or API keys
- 💉 SQL injection risks
- 🌐 XSS vulnerabilities

### Best Practices

- 📚 Language-specific best practices
- 🏗️ Architecture patterns
- ⚡ Performance optimizations
- 🧪 Testing coverage gaps

### Framework-Specific

For your projects (Next.js, React, Python):

- ⚛️ React component patterns
- 🔄 Next.js 15 App Router best practices
- 🐍 Python PEP 8 compliance
- 📊 TypeScript strict mode issues

## 📊 Bugbot in Action

### Example Review Comment

```markdown
## 🐛 Bugbot Review

### Issues Found: 2

#### 🔴 Critical: SQL Injection Risk

**File:** `app/api/users/route.ts` **Line:** 42

The user input is directly concatenated into a SQL query without validation.

**Suggestion:** Use parameterized queries with Supabase: \`\`\`typescript const { data }
= await supabase .from('users') .select() .eq('email', userEmail); \`\`\`

#### 🟡 Warning: Missing Error Handling

**File:** `lib/auth.ts` **Line:** 87

Async function doesn't handle potential errors.

**Suggestion:** Wrap in try-catch and use proper error logging: \`\`\`typescript try {
const result = await authenticate(); return result; } catch (error) { logger.error({
error }, "Authentication failed"); throw new AuthenticationError("Failed to
authenticate"); } \`\`\`

### ✅ Looks Good

- TypeScript strict mode compliance
- Proper structured logging
- Security headers configured correctly
```

## ⚙️ Configuration Options

### Dashboard Settings

In https://cursor.com/dashboard under Bugbot:

- **Auto-review:** Enable/disable automatic reviews
- **Review draft PRs:** Include draft pull requests
- **Notification level:** Choose comment verbosity
- **Review filters:**
  - File patterns to include/exclude
  - Severity levels (Critical, Warning, Info)
  - Specific check types

### Repository-Specific Configuration

Create `.cursor/bugbot.json` in your repository:

```json
{
  "enabled": true,
  "autoReview": true,
  "reviewDrafts": false,
  "excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/dist/**",
    "**/node_modules/**"
  ],
  "includePatterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py"],
  "severityThreshold": "warning",
  "checks": {
    "security": true,
    "performance": true,
    "bestPractices": true,
    "typeErrors": true,
    "stylistic": false
  },
  "customRules": ".cursor/rules/"
}
```

## 🐛 Troubleshooting

### Bugbot Isn't Running

**Check Installation:**

```bash
# Verify GitHub App is installed
gh api /repos/OWNER/REPO/installation
```

**Verify Permissions:**

- Go to: https://github.com/settings/installations
- Find "Cursor Bugbot"
- Check repository access
- Ensure all required permissions are granted

### No Comments on PRs

1. **Check if Bugbot is enabled:**
   - Visit: https://cursor.com/dashboard
   - Verify repository is toggled ON

2. **Manually trigger:**

   ```
   cursor review verbose=true
   ```

3. **Check PR requirements:**
   - PR must have code changes (not just docs)
   - Repository must be accessible to Bugbot
   - PR must not be closed

### Get Request ID for Support

Comment on PR:

```
cursor review verbose=true
```

Look for the request ID in Bugbot's response, then contact support with:

- Request ID
- Repository name
- PR number
- Description of issue

## 🔄 Comparison with Claude Code

| Feature           | Cursor Bugbot                 | Claude Code (GitHub Actions)  |
| ----------------- | ----------------------------- | ----------------------------- |
| **Trigger**       | Automatic on PR               | Manual (`@claude` comment)    |
| **Integration**   | GitHub App                    | GitHub Actions workflow       |
| **Setup**         | Dashboard configuration       | Workflow YAML + secrets       |
| **Cost**          | Free with Cursor subscription | Requires Anthropic API key    |
| **Review Style**  | Bug-focused, concise          | Comprehensive, Sherlock-style |
| **Configuration** | `.cursor/bugbot.json`         | `claude.json` + `CLAUDE.md`   |
| **Best For**      | Quick bug detection           | In-depth code review          |

**Recommendation:** Use both!

- **Bugbot:** Automatic first-line bug detection
- **Claude Code:** Deep reviews when needed with `@claude review`

## 📋 Current Status Checklist

Use this checklist to verify your setup:

- [ ] Cursor Bugbot GitHub App installed
- [ ] Repository access granted to Bugbot
- [ ] Bugbot configured in Cursor Dashboard
- [ ] Repository enabled in dashboard
- [ ] `.cursor/bugbot.json` created (optional)
- [ ] Test PR created and reviewed
- [ ] Manual trigger tested (`cursor review`)
- [ ] Verbose mode tested for debugging

## 🎓 Best Practices

### 1. Enable on Active Development Repos

Only enable Bugbot on repositories with active development to avoid noise.

### 2. Start with Warnings and Above

Configure `severityThreshold: "warning"` to reduce low-priority feedback.

### 3. Exclude Test Files Initially

Add test files to `excludePatterns` to focus on production code first.

### 4. Use Verbose Mode for Debugging

Always use `cursor review verbose=true` when troubleshooting.

### 5. Combine with Claude Code

Use Bugbot for automatic checks and Claude Code for detailed reviews:

```
# Bugbot runs automatically

# For deep dive, tag Claude:
@claude Please review this authentication implementation in detail
```

### 6. Review Bugbot Suggestions

Not all suggestions are perfect. Review them critically and adapt to your context.

### 7. Configure Custom Rules

Point Bugbot to your `.cursor/rules/` directory for project-specific guidelines.

## 🔗 Useful Links

- **Bugbot GitHub App:** https://github.com/apps/cursor-bugbot
- **Cursor Dashboard:** https://cursor.com/dashboard
- **Bugbot Documentation:** https://docs.cursor.com/en/bugbot
- **GitHub App Settings:** https://github.com/settings/installations
- **Support:** support@cursor.com

## 📞 Getting Help

### Community Support

- **Cursor Discord:** https://discord.gg/cursor
- **Cursor Forum:** https://forum.cursor.com

### Reporting Issues

1. Get request ID: `cursor review verbose=true`
2. Check: https://cursor.com/dashboard for status
3. Email: support@cursor.com with:
   - Request ID
   - Repository URL
   - PR number
   - Screenshots of issue

---

Elementary! With Bugbot watching your code, bugs won't stand a chance. 🔍🐛✨
