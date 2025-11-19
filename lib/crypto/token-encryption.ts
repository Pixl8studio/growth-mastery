/**
 * OAuth Token Encryption Utilities
 * Provides client-side encryption/decryption using the database's pgcrypto functions
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Encrypt an OAuth token using database-level encryption
 * Uses pgcrypto's AES-256 encryption via stored function
 */
export async function encryptToken(token: string): Promise<string> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase.rpc("encrypt_token", {
            token,
        });

        if (error) {
            logger.error({ error }, "Failed to encrypt token");
            throw new Error("Token encryption failed");
        }

        if (!data) {
            throw new Error("Encryption returned no data");
        }

        return data;
    } catch (error) {
        logger.error({ error }, "Error encrypting token");
        throw error;
    }
}

/**
 * Decrypt an OAuth token using database-level decryption
 * Uses pgcrypto's AES-256 decryption via stored function
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase.rpc("decrypt_token", {
            encrypted_token: encryptedToken,
        });

        if (error) {
            logger.error({ error }, "Failed to decrypt token");
            throw new Error("Token decryption failed");
        }

        if (!data) {
            throw new Error("Decryption returned no data");
        }

        return data;
    } catch (error) {
        logger.error({ error }, "Error decrypting token");
        throw error;
    }
}
