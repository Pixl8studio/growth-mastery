-- Migration: Add Token Encryption Functions
-- Description: Implements pgcrypto-based encryption for OAuth tokens
-- Date: 2025-11-15
-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption function for OAuth tokens
-- Uses AES-256 encryption with the app encryption key from settings
CREATE OR REPLACE FUNCTION encrypt_token (token TEXT) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get encryption key from app settings
    -- In production, this should be stored in Supabase Vault or environment
    encryption_key := current_setting('app.encryption_key', true);

    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'Encryption key not configured';
    END IF;

    -- Encrypt using AES-256
    RETURN encode(
        pgp_sym_encrypt(token, encryption_key),
        'base64'
    );
END;
$$;

-- Create decryption function for OAuth tokens
CREATE OR REPLACE FUNCTION decrypt_token (encrypted_token TEXT) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get encryption key from app settings
    encryption_key := current_setting('app.encryption_key', true);

    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'Encryption key not configured';
    END IF;

    -- Decrypt using AES-256
    RETURN pgp_sym_decrypt(
        decode(encrypted_token, 'base64'),
        encryption_key
    );
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION encrypt_token (TEXT) IS 'Encrypts OAuth tokens using AES-256 encryption';

COMMENT ON FUNCTION decrypt_token (TEXT) IS 'Decrypts OAuth tokens using AES-256 decryption';

-- Note: The encryption key should be set at the database connection level:
-- ALTER DATABASE postgres SET app.encryption_key = 'your-secure-key-here';
-- Or passed via connection string/environment variable
