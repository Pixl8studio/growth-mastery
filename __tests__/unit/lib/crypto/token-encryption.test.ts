/**
 * Unit tests for lib/crypto/token-encryption.ts
 * Tests OAuth token encryption/decryption using Supabase RPC
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

// Mock Supabase client
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        rpc: mockRpc,
    })),
}));

// Import after mocks are set up
const { encryptToken, decryptToken } = await import("@/lib/crypto/token-encryption");

describe("lib/crypto/token-encryption", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("encryptToken", () => {
        it("should encrypt token successfully", async () => {
            const token = "oauth_token_123";
            const encryptedToken = "encrypted_data_abc";

            mockRpc.mockResolvedValue({ data: encryptedToken, error: null });

            const result = await encryptToken(token);

            expect(result).toBe(encryptedToken);
            expect(mockRpc).toHaveBeenCalledWith("encrypt_token", { token });
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("should throw error when RPC returns error", async () => {
            const token = "oauth_token_123";
            const error = new Error("Encryption failed");

            mockRpc.mockResolvedValue({ data: null, error });

            await expect(encryptToken(token)).rejects.toThrow(
                "Token encryption failed"
            );
            expect(logger.error).toHaveBeenCalledWith(
                { error },
                "Failed to encrypt token"
            );
        });

        it("should throw error when RPC returns no data", async () => {
            const token = "oauth_token_123";

            mockRpc.mockResolvedValue({ data: null, error: null });

            await expect(encryptToken(token)).rejects.toThrow(
                "Encryption returned no data"
            );
        });

        it("should handle network errors", async () => {
            const token = "oauth_token_123";
            const networkError = new Error("Network error");

            mockRpc.mockRejectedValue(networkError);

            await expect(encryptToken(token)).rejects.toThrow("Network error");
            expect(logger.error).toHaveBeenCalledWith(
                { error: networkError },
                "Error encrypting token"
            );
        });
    });

    describe("decryptToken", () => {
        it("should decrypt token successfully", async () => {
            const encryptedToken = "encrypted_data_abc";
            const decryptedToken = "oauth_token_123";

            mockRpc.mockResolvedValue({ data: decryptedToken, error: null });

            const result = await decryptToken(encryptedToken);

            expect(result).toBe(decryptedToken);
            expect(mockRpc).toHaveBeenCalledWith("decrypt_token", {
                encrypted_token: encryptedToken,
            });
            expect(logger.error).not.toHaveBeenCalled();
        });

        it("should throw error when RPC returns error", async () => {
            const encryptedToken = "encrypted_data_abc";
            const error = new Error("Decryption failed");

            mockRpc.mockResolvedValue({ data: null, error });

            await expect(decryptToken(encryptedToken)).rejects.toThrow(
                "Token decryption failed"
            );
            expect(logger.error).toHaveBeenCalledWith(
                { error },
                "Failed to decrypt token"
            );
        });

        it("should throw error when RPC returns no data", async () => {
            const encryptedToken = "encrypted_data_abc";

            mockRpc.mockResolvedValue({ data: null, error: null });

            await expect(decryptToken(encryptedToken)).rejects.toThrow(
                "Decryption returned no data"
            );
        });

        it("should handle network errors", async () => {
            const encryptedToken = "encrypted_data_abc";
            const networkError = new Error("Network error");

            mockRpc.mockRejectedValue(networkError);

            await expect(decryptToken(encryptedToken)).rejects.toThrow("Network error");
            expect(logger.error).toHaveBeenCalledWith(
                { error: networkError },
                "Error decrypting token"
            );
        });

        it("should handle invalid encrypted token format", async () => {
            const invalidToken = "invalid_format";
            const error = new Error("Invalid token format");

            mockRpc.mockResolvedValue({ data: null, error });

            await expect(decryptToken(invalidToken)).rejects.toThrow(
                "Token decryption failed"
            );
        });
    });

    describe("encryption/decryption round-trip", () => {
        it("should encrypt and decrypt token successfully", async () => {
            const originalToken = "oauth_token_123";
            const encryptedToken = "encrypted_data_abc";

            // Mock encryption
            mockRpc.mockResolvedValueOnce({ data: encryptedToken, error: null });
            const encrypted = await encryptToken(originalToken);

            // Mock decryption
            mockRpc.mockResolvedValueOnce({ data: originalToken, error: null });
            const decrypted = await decryptToken(encrypted);

            expect(decrypted).toBe(originalToken);
        });
    });
});
