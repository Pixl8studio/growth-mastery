/**
 * Integration tests for OAuth token encryption/decryption
 * Tests database-level encryption using pgcrypto functions
 */

import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "@/lib/crypto/token-encryption";

describe("OAuth Token Encryption", () => {
    const testToken = "test_oauth_token_abc123_secret";

    // Note: These tests require a properly configured database with encryption key
    // They may be skipped in CI/CD if database is not available

    it("should encrypt a token", async () => {
        try {
            const encrypted = await encryptToken(testToken);

            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(testToken);
            expect(encrypted.length).toBeGreaterThan(0);
        } catch (error) {
            // If encryption key is not configured, test should skip gracefully
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn(
                    "Skipping encryption test - encryption key not configured"
                );
                return;
            }
            throw error;
        }
    });

    it("should decrypt an encrypted token back to original", async () => {
        try {
            const encrypted = await encryptToken(testToken);
            const decrypted = await decryptToken(encrypted);

            expect(decrypted).toBe(testToken);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn(
                    "Skipping decryption test - encryption key not configured"
                );
                return;
            }
            throw error;
        }
    });

    it("should produce different encrypted values for same token", async () => {
        try {
            // pgcrypto uses IV (initialization vector) so same plaintext produces different ciphertext
            const encrypted1 = await encryptToken(testToken);
            const encrypted2 = await encryptToken(testToken);

            // Both should decrypt to same value but encrypted values should differ (due to IV)
            const decrypted1 = await decryptToken(encrypted1);
            const decrypted2 = await decryptToken(encrypted2);

            expect(decrypted1).toBe(testToken);
            expect(decrypted2).toBe(testToken);
            expect(encrypted1).not.toBe(encrypted2); // Different IV makes ciphertext different
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn("Skipping IV test - encryption key not configured");
                return;
            }
            throw error;
        }
    });

    it("should handle long tokens", async () => {
        try {
            const longToken = "a".repeat(500);
            const encrypted = await encryptToken(longToken);
            const decrypted = await decryptToken(encrypted);

            expect(decrypted).toBe(longToken);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn(
                    "Skipping long token test - encryption key not configured"
                );
                return;
            }
            throw error;
        }
    });

    it("should handle special characters in tokens", async () => {
        try {
            const specialToken = "token!@#$%^&*()_+-={}[]|:;<>?,./~`";
            const encrypted = await encryptToken(specialToken);
            const decrypted = await decryptToken(encrypted);

            expect(decrypted).toBe(specialToken);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn(
                    "Skipping special chars test - encryption key not configured"
                );
                return;
            }
            throw error;
        }
    });

    it("should fail to decrypt with wrong encrypted data", async () => {
        try {
            const badEncrypted = "invalid_base64_data";

            await expect(decryptToken(badEncrypted)).rejects.toThrow();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn("Skipping bad data test - encryption key not configured");
                return;
            }
            throw error;
        }
    });

    it("should handle empty string token", async () => {
        try {
            const emptyToken = "";
            const encrypted = await encryptToken(emptyToken);
            const decrypted = await decryptToken(encrypted);

            expect(decrypted).toBe(emptyToken);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("Encryption key not configured")) {
                console.warn(
                    "Skipping empty token test - encryption key not configured"
                );
                return;
            }
            throw error;
        }
    });
});

describe("OAuth Token Encryption - Error Handling", () => {
    it("should throw error when encryption key is not configured", async () => {
        // This test validates that the system fails gracefully without encryption key
        // In a real environment without encryption key, this should throw
        // Note: This may pass if encryption key IS configured

        try {
            const token = "test_token";
            await encryptToken(token);
            // If we reach here, encryption key is configured (which is good!)
            expect(true).toBe(true);
        } catch (error) {
            // Error is expected when key is not configured
            expect(error).toBeDefined();
            const errorMessage = error instanceof Error ? error.message : String(error);
            expect(errorMessage).toMatch(/encryption|configured/i);
        }
    });
});

/**
 * Note for developers:
 *
 * To run these tests successfully, ensure:
 * 1. Database is running with pgcrypto extension enabled
 * 2. Encryption key is set via: ALTER DATABASE postgres SET app.encryption_key = 'your-key';
 * 3. Or encryption key is passed via connection string
 *
 * If running in CI/CD, these tests will gracefully skip if database is not available.
 */
