# Referral Code System - Quick Start Guide

## TL;DR

A referral code system has been implemented. Users must provide a valid referral code to
sign up. The initial code is `POWERGROWTH`.

## Apply the Migration

```bash
npx supabase db push
```

## Test It Works

```bash
# Test database setup
npx tsx scripts/test-referral-codes.ts

# Test API endpoints
npm test __tests__/integration/referral-code-signup.test.ts
```

## Manual Test

1. Go to `/signup`
2. Try signing up with referral code: `POWERGROWTH` ✅
3. Try without code ❌
4. Try with invalid code ❌

## Managing Referral Codes

### Check All Codes

```sql
SELECT * FROM referral_codes;
```

### Add New Code

```sql
INSERT INTO referral_codes (code, description, is_active, max_uses)
VALUES ('NEWCODE', 'Description here', true, NULL);
```

### Deactivate Code

```sql
UPDATE referral_codes SET is_active = false WHERE code = 'OLDCODE';
```

### Check Usage

```sql
SELECT code, current_uses, max_uses, is_active
FROM referral_codes
ORDER BY created_at DESC;
```

## API Usage (Future Admin Panel)

### Validate Code

```bash
curl -X POST http://localhost:3000/api/auth/validate-referral \
  -H "Content-Type: application/json" \
  -d '{"code":"POWERGROWTH"}'
```

### List All Codes (Requires Auth)

```bash
curl http://localhost:3000/api/admin/referral-codes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create New Code (Requires Auth)

```bash
curl -X POST http://localhost:3000/api/admin/referral-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"code":"NEWCODE","description":"New code","max_uses":100}'
```

## What Changed

1. **Database**: New `referral_codes` table + `referral_code_id` in `user_profiles`
2. **Signup Form**: New required "Referral Code" field
3. **Validation**: Code must exist and be active to create account
4. **Existing Users**: Unaffected - can still log in normally

## Troubleshooting

**Users can't sign up**: Check if POWERGROWTH code is active

```sql
UPDATE referral_codes SET is_active = true WHERE code = 'POWERGROWTH';
```

**Code not working**: Verify it exists and is active

```sql
SELECT * FROM referral_codes WHERE UPPER(code) = UPPER('yourcode');
```

**Usage not incrementing**: Check trigger is active

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Full Documentation

See `docs/referral-code-system.md` for complete details.

## Files Modified

- ✅ Database migration created
- ✅ Signup form updated
- ✅ API endpoints added
- ✅ Tests written
- ✅ Documentation complete

**Status: Ready for deployment** 🚀
