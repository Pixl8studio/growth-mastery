# 🚀 Cursor Bugbot Quick Start

## ⚡ 3-Step Setup

### Step 1: Install GitHub App (2 minutes)

1. Visit: **https://github.com/apps/cursor-bugbot**
2. Click **"Install"**
3. Select repository: **`danlawless/genie-ai`**
4. Click **"Install & Authorize"**

### Step 2: Configure in Dashboard (1 minute)

1. Visit: **https://cursor.com/dashboard**
2. Click **"Bugbot"** tab
3. Click **"Connect GitHub"** (if needed)
4. Toggle **ON** for `danlawless/genie-ai`

### Step 3: Test It (30 seconds)

1. Create a pull request
2. Wait for Bugbot's automatic review
3. Or comment: `cursor review`

**Done!** 🎉

## ✅ Verify Installation

Run the checker script:

```bash
./scripts/check-bugbot.sh
```

Expected output:

```
✅ Cursor Bugbot is installed and ready!
```

## 🎯 Using Bugbot

### Automatic Mode (Default)

Bugbot automatically reviews every pull request.

### Manual Trigger

Comment on any PR:

```
cursor review
```

### Debug Mode

Get detailed logs:

```
cursor review verbose=true
```

## 📊 What You Already Have

✅ **Bugbot Configuration:** `.cursor/bugbot.json`

- Auto-review enabled
- Security checks: ON
- Performance checks: ON
- Excludes test files
- Focuses on warnings and errors

✅ **Cursor Rules:** 21 rule files

- TypeScript standards
- React/Next.js patterns
- Python coding standards
- Security best practices
- Git workflows

✅ **Repository Settings:**

- Next.js 15 with App Router
- TypeScript strict mode
- Supabase integration
- Structured logging (Pino)

## 🐛 What Bugbot Will Catch

### Security Issues 🔐

- Hardcoded secrets
- SQL injection risks
- XSS vulnerabilities
- Insecure dependencies

### Code Quality 📏

- TypeScript errors
- Unused imports
- Console.log statements
- Missing error handling

### Best Practices ✨

- Next.js 15 patterns
- React 19 optimization
- Supabase best practices
- Proper logging

### Performance ⚡

- Unnecessary re-renders
- Large bundle sizes
- Inefficient queries
- Memory leaks

## 📚 Full Documentation

See **`docs/CURSOR_BUGBOT_SETUP.md`** for:

- Detailed setup instructions
- Configuration options
- Troubleshooting guide
- Best practices
- Comparison with Claude Code

## 🆘 Troubleshooting

### Bugbot Not Running?

```bash
# Check installation
./scripts/check-bugbot.sh

# Manually trigger
# Comment on PR: cursor review verbose=true
```

### Need Help?

1. Check: https://docs.cursor.com/en/bugbot
2. Run: `./scripts/check-bugbot.sh`
3. Email: support@cursor.com

## 🎭 Bugbot + Claude Code

You have **both** AI reviewers configured:

| Tool            | When It Runs          | Best For            |
| --------------- | --------------------- | ------------------- |
| **Bugbot**      | Automatic on every PR | Quick bug detection |
| **Claude Code** | Manual (`@claude`)    | Deep code review    |

**Pro tip:** Let Bugbot catch bugs automatically, then tag `@claude` for in-depth
architectural review!

---

Elementary! Your bug-hunting arsenal is ready. 🔍🐛✨
