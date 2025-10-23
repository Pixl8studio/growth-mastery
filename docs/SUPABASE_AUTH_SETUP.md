# Supabase Authentication Setup

## ✅ Connection Test Results

Your Supabase connection is **working perfectly**! All systems are operational:

- ✅ Environment variables loaded correctly
- ✅ Database connectivity working
- ✅ Auth service accessible
- ✅ All tables accessible

## 🔍 Current Issue

The authentication is failing because of Supabase configuration settings, **not**
because of connection issues.

## 🛠️ Quick Test Commands

We've added test scripts to help you debug:

```bash
# Test basic Supabase connection
pnpm db:test-connection

# Check Supabase configuration
pnpm db:check-config

# Interactive auth test (sign up/sign in)
pnpm db:test-auth
```

## ⚙️ Required Supabase Configuration

Go to your Supabase Dashboard and configure these settings:

### 1. Email Provider Settings

**URL:** https://supabase.com/dashboard/project/ufndmgxmlceuoapgvfco/auth/providers

- ✓ **Enable** email provider
- ✓ **Disable** "Confirm email" (for development)
- ✓ Keep "Secure email change" enabled

### 2. Site URL Configuration

**URL:**
https://supabase.com/dashboard/project/ufndmgxmlceuoapgvfco/auth/url-configuration

Add these URLs:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:**
  - `http://localhost:3000/**`
  - Your production URL (e.g., `https://yourdomain.com/**`)

### 3. Email Domain Restrictions

Check if there are any email domain restrictions that might be blocking test emails:

- For development: **Remove** all domain restrictions
- Or add specific test domains you want to use

### 4. Rate Limiting

If you're testing frequently:

- Increase rate limits in Auth settings
- Default is 30 requests per hour per IP

## 🧪 Testing Authentication

### Option 1: Use the interactive test script

```bash
pnpm db:test-auth
```

This will let you:

1. Test sign up with a real email
2. Test sign in with existing credentials
3. See detailed error messages

### Option 2: Test in the browser

Once you've configured Supabase:

1. Start the dev server: `pnpm dev`
2. Go to: http://localhost:3000/login
3. Try signing up with a valid email address
4. Check for any error messages

## 🐛 Common Issues & Solutions

### "Invalid login credentials"

- Email or password is incorrect
- Email hasn't been confirmed yet (check your email)
- User doesn't exist (try signing up first)

### "Email address is invalid"

- Domain restrictions are enabled in Supabase
- Remove domain restrictions or use allowed domains

### "Email rate limit exceeded"

- Too many requests from your IP
- Wait a few minutes or increase rate limits

### No session after sign up

- Email confirmation is required
- Check your email for confirmation link
- Or disable email confirmation in Supabase Auth settings

## 📝 Recommended Development Setup

For the smoothest development experience:

1. **Disable email confirmation** - Sign up creates session immediately
2. **Add localhost URLs** - Prevents redirect issues
3. **Remove domain restrictions** - Test with any email
4. **Increase rate limits** - Avoid hitting limits during testing
5. **Use test email account** - Don't use production emails for testing

## 🔐 Security Note

The settings above are for **development only**. For production:

- ✓ **Enable** email confirmation
- ✓ Add specific allowed domains if needed
- ✓ Use appropriate rate limits
- ✓ Only allow production URLs for redirects

## 📚 Next Steps

1. Configure Supabase settings using the links above
2. Run `pnpm db:test-auth` to verify authentication works
3. Try logging in through your app at http://localhost:3000/login
4. If issues persist, check Supabase logs for detailed error messages

## 🔗 Quick Links

- [Auth Providers](https://supabase.com/dashboard/project/ufndmgxmlceuoapgvfco/auth/providers)
- [URL Configuration](https://supabase.com/dashboard/project/ufndmgxmlceuoapgvfco/auth/url-configuration)
- [Email Templates](https://supabase.com/dashboard/project/ufndmgxmlceuoapgvfco/auth/templates)
- [Supabase Logs](https://supabase.com/dashboard/project/ufndmgxmlceuoapgvfco/logs/explorer)

---

**TL;DR:** Your connection works! Just need to configure Supabase Auth settings in the
dashboard. Use `pnpm db:check-config` to see what to configure.
