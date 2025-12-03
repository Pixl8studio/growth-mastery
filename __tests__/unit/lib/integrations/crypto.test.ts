/**
 * Unit tests for lib/integrations/crypto.ts
 * Tests Node.js crypto-based token encryption/decryption
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock environment variable
vi.mock("@/lib/env", () => ({
    env: {
        INTEGRATION_ENCRYPTION_KEY: "test-key-32-characters-long-1234",
    },
}));

// Import after mocks are set up
const { encryptToken, decryptToken } = await import("@/lib/integrations/crypto");

describe("lib/integrations/crypto", () => {
    describe("encryptToken", () => {
        it("should encrypt token successfully", () => {
            const token = "oauth_token_12345";

            const encrypted = encryptToken(token);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe("string");
            expect(encrypted).not.toBe(token);
            expect(encrypted.length).toBeGreaterThan(0);
        });

        it("should produce different encrypted outputs for same input", () => {
            const token = "oauth_token_12345";

            const encrypted1 = encryptToken(token);
            const encrypted2 = encryptToken(token);

            // Different IVs and salts should produce different outputs
            expect(encrypted1).not.toBe(encrypted2);
        });

        it("should handle empty string", () => {
            const token = "";

            const encrypted = encryptToken(token);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe("string");
        });

        it("should handle special characters", () => {
            const token = "token_with_special!@#$%^&*()_+-=[]{}|;:',.<>?/";

            const encrypted = encryptToken(token);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe("string");
        });

        it("should handle unicode characters", () => {
            const token = "token_with_unicode_こんにちは_🚀";

            const encrypted = encryptToken(token);

            expect(encrypted).toBeDefined();
            expect(typeof encrypted).toBe("string");
        });

        it("should return base64 encoded string", () => {
            const token = "oauth_token_12345";

            const encrypted = encryptToken(token);

            // Base64 regex pattern
            expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });
    });

    describe("decryptToken", () => {
        it("should decrypt token successfully", () => {
            const originalToken = "oauth_token_12345";

            const encrypted = encryptToken(originalToken);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(originalToken);
        });

        it("should handle empty string", () => {
            const originalToken = "";

            const encrypted = encryptToken(originalToken);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(originalToken);
        });

        it("should handle special characters", () => {
            const originalToken = "token_with_special!@#$%^&*()_+-=[]{}|;:',.<>?/";

            const encrypted = encryptToken(originalToken);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(originalToken);
        });

        it("should handle unicode characters", () => {
            const originalToken = "token_with_unicode_こんにちは_🚀";

            const encrypted = encryptToken(originalToken);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(originalToken);
        });

        it("should handle long tokens", () => {
            const originalToken = "a".repeat(1000);

            const encrypted = encryptToken(originalToken);
            const decrypted = decryptToken(encrypted);

            expect(decrypted).toBe(originalToken);
        });

        it("should throw error for invalid encrypted data", () => {
            const invalidEncrypted = "invalid_base64_!@#$%";

            expect(() => decryptToken(invalidEncrypted)).toThrow();
        });

        it("should throw error for tampered encrypted data", () => {
            const originalToken = "oauth_token_12345";
            const encrypted = encryptToken(originalToken);

            // Tamper with the encrypted data
            const tamperedData =
                encrypted.substring(0, encrypted.length - 10) + "AAAAAAAAAA";

            expect(() => decryptToken(tamperedData)).toThrow();
        });

        it("should throw error for truncated encrypted data", () => {
            const originalToken = "oauth_token_12345";
            const encrypted = encryptToken(originalToken);

            // Truncate the encrypted data
            const truncatedData = encrypted.substring(0, 50);

            expect(() => decryptToken(truncatedData)).toThrow();
        });
    });

    describe("encryption/decryption round-trip", () => {
        it("should handle multiple round-trips", () => {
            const originalToken = "oauth_token_12345";

            const encrypted1 = encryptToken(originalToken);
            const decrypted1 = decryptToken(encrypted1);

            const encrypted2 = encryptToken(decrypted1);
            const decrypted2 = decryptToken(encrypted2);

            expect(decrypted2).toBe(originalToken);
        });

        it("should handle different token values", () => {
            const tokens = [
                "short",
                "medium_length_token_123",
                "very_long_token_".repeat(10),
                "special!@#$%^&*()",
                "unicode_こんにちは_🚀",
            ];

            tokens.forEach((token) => {
                const encrypted = encryptToken(token);
                const decrypted = decryptToken(encrypted);
                expect(decrypted).toBe(token);
            });
        });
    });

    describe("security properties", () => {
        it("should use unique salt for each encryption", () => {
            const token = "oauth_token_12345";

            const encrypted1 = encryptToken(token);
            const encrypted2 = encryptToken(token);

            // Decode base64 to get the binary data
            const buffer1 = Buffer.from(encrypted1, "base64");
            const buffer2 = Buffer.from(encrypted2, "base64");

            // First 64 bytes are the salt
            const salt1 = buffer1.subarray(0, 64);
            const salt2 = buffer2.subarray(0, 64);

            expect(salt1.equals(salt2)).toBe(false);
        });

        it("should use unique IV for each encryption", () => {
            const token = "oauth_token_12345";

            const encrypted1 = encryptToken(token);
            const encrypted2 = encryptToken(token);

            // Decode base64 to get the binary data
            const buffer1 = Buffer.from(encrypted1, "base64");
            const buffer2 = Buffer.from(encrypted2, "base64");

            // Bytes 64-79 are the IV (after 64-byte salt)
            const iv1 = buffer1.subarray(64, 80);
            const iv2 = buffer2.subarray(64, 80);

            expect(iv1.equals(iv2)).toBe(false);
        });

        it("should include authentication tag", () => {
            const token = "oauth_token_12345";
            const encrypted = encryptToken(token);

            // Decode base64 to get the binary data
            const buffer = Buffer.from(encrypted, "base64");

            // Should have salt (64) + IV (16) + tag (16) + encrypted data
            expect(buffer.length).toBeGreaterThanOrEqual(96);
        });
    });
});
