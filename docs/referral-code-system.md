# Referral Code System

## Overview

The referral code system requires all new users to provide a valid referral code during
signup. This feature provides controlled access to the platform and tracks user
acquisition through specific referral codes.

## Features

- **Required for Signup**: Users must provide a valid referral code to create an account
- **Case-Insensitive**: Codes work regardless of capitalization (POWERGROWTH =
  powergrowth = PowerGrowth)
- **Usage Tracking**: Tracks how many times each code has been used
- **Usage Limits**: Optional max_uses constraint to limit code usage
- **Grandfathered Users**: Existing users are unaffected (referral_code_id can be null)
- **Admin Management**: API endpoints for future admin panel integration

## Database Schema

### referral_codes Table

```sql
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,           -- Referral code (uppercase)
  description TEXT,                     -- Optional description
  is_active BOOLEAN DEFAULT true,       -- Active status
  max_uses INTEGER,                     -- Max uses (NULL = unlimited)
  current_uses INTEGER DEFAULT 0,       -- Current usage count
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### user_profiles Updates

Added `referral_code_id` column to track which code was used:

```sql
ALTER TABLE public.user_profiles
ADD COLUMN referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL;
```

## Initial Setup

The system comes with one pre-configured referral code:

- **Code**: `POWERGROWTH`
- **Status**: Active
- **Max Uses**: Unlimited
- **Description**: Initial launch referral code

## User Flow

1. User visits signup page
2. User enters their information including a referral code
3. Frontend validates code format (alphanumeric only)
4. API validates code exists and is active
5. API checks max_uses constraint if set
6. If valid, user account is created with referral code stored in metadata
7. Database trigger increments usage count and stores referral_code_id in user profile

## API Endpoints

### Validate Referral Code

**POST** `/api/auth/validate-referral`

Validates a referral code before signup.

**Request:**

```json
{
  "code": "POWERGROWTH"
}
```

**Response:**

```json
{
  "valid": true
}
```

Or if invalid:

```json
{
  "valid": false,
  "message": "Invalid or inactive referral code"
}
```

### List Referral Codes (Admin)

**GET** `/api/admin/referral-codes`

Lists all referral codes with usage statistics. Requires authentication.

**Response:**

```json
{
  "referralCodes": [
    {
      "id": "uuid",
      "code": "POWERGROWTH",
      "description": "Initial launch referral code",
      "is_active": true,
      "max_uses": null,
      "current_uses": 42,
      "created_at": "2025-10-31T14:00:00Z",
      "updated_at": "2025-10-31T14:00:00Z"
    }
  ]
}
```

### Create Referral Code (Admin)

**POST** `/api/admin/referral-codes`

Creates a new referral code. Requires authentication.

**Request:**

```json
{
  "code": "NEWCODE123",
  "description": "Special promo code",
  "max_uses": 100
}
```

**Response:**

```json
{
  "referralCode": {
    "id": "uuid",
    "code": "NEWCODE123",
    "description": "Special promo code",
    "is_active": true,
    "max_uses": 100,
    "current_uses": 0,
    "created_at": "2025-10-31T14:00:00Z",
    "updated_at": "2025-10-31T14:00:00Z"
  }
}
```

### Update Referral Code (Admin)

**PATCH** `/api/admin/referral-codes`

Updates an existing referral code. Requires authentication.

**Request:**

```json
{
  "id": "uuid",
  "is_active": false,
  "max_uses": 50
}
```

**Response:**

```json
{
  "referralCode": {
    "id": "uuid",
    "code": "NEWCODE123",
    "is_active": false,
    "max_uses": 50,
    ...
  }
}
```

## Security Features

1. **Input Sanitization**: All codes are trimmed, uppercased, and validated for
   alphanumeric characters only
2. **Rate Limiting**: Validation endpoint should be rate-limited to prevent brute force
   attacks
3. **Structured Logging**: All referral code operations are logged with structured
   logging via Pino
4. **Error Tracking**: All errors are logged with full context for debugging
5. **RLS Policies**: Row-level security ensures proper access control

## Testing

Run the test script to verify the system:

```bash
npx tsx scripts/test-referral-codes.ts
```

The test script validates:

- POWERGROWTH code exists and is active
- Case-insensitive lookup works correctly
- Referral code creation and validation
- Max uses constraint enforcement
- Database schema updates

## Manual Testing Checklist

- [ ] Signup with valid code (POWERGROWTH) - should succeed
- [ ] Signup with invalid code - should fail with error message
- [ ] Signup without code - should fail with error message
- [ ] Test case variations (powergrowth, PowerGrowth) - should succeed
- [ ] Create code via admin API - should succeed
- [ ] Update code status via admin API - should succeed
- [ ] Verify usage count increments after signup
- [ ] Verify existing users can still log in (grandfathered in)

## Future Enhancements

1. **Admin Panel**: Build UI for managing referral codes
2. **Analytics Dashboard**: Track code performance and conversion rates
3. **Referral Rewards**: Implement reward system for code creators
4. **Bulk Import**: CSV import for multiple codes
5. **Expiration Dates**: Add time-based code expiration
6. **User-Generated Codes**: Allow users to create their own referral codes

## Database Migration

The referral code system is implemented in migration:

```
supabase/migrations/20251031140000_add_referral_codes.sql
```

To apply the migration:

```bash
# Using Supabase CLI
npx supabase db push

# Or apply directly to your database
psql -d your_database -f supabase/migrations/20251031140000_add_referral_codes.sql
```

## Troubleshooting

### Users Can't Sign Up

**Issue**: "Invalid or inactive referral code" error

**Solutions**:

1. Verify POWERGROWTH code exists:
   `SELECT * FROM referral_codes WHERE code = 'POWERGROWTH';`
2. Check code is active:
   `UPDATE referral_codes SET is_active = true WHERE code = 'POWERGROWTH';`
3. Check max_uses not exceeded:
   `SELECT current_uses, max_uses FROM referral_codes WHERE code = 'POWERGROWTH';`

### Migration Fails

**Issue**: Migration errors when applying

**Solutions**:

1. Ensure `uuid-ossp` extension is enabled
2. Ensure `handle_updated_at()` function exists (from previous migrations)
3. Check for existing columns before applying

### Usage Count Not Incrementing

**Issue**: Signups succeed but current_uses stays at 0

**Solutions**:

1. Verify trigger is active:
   `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Check trigger function includes referral code logic
3. Verify referral code is passed in auth metadata

## Support

For issues or questions about the referral code system, contact the development team or
open an issue in the project repository.
