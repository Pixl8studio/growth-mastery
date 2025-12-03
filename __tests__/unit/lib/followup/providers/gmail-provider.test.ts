/**
 * Tests for Gmail Provider
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock gmail-oauth-service
const mockGetValidGmailToken = vi.fn();
vi.mock("@/lib/followup/gmail-oauth-service", () => ({
    getValidGmailToken: mockGetValidGmailToken,
}));

// Mock fetch
global.fetch = vi.fn();

// Import provider
const { GmailEmailProvider } = await import("@/lib/followup/providers/gmail-provider");

describe("GmailEmailProvider", () => {
    let provider: any;

    beforeEach(() => {
        provider = new GmailEmailProvider("agent-123");
        vi.clearAllMocks();
    });

    it("has correct name", () => {
        expect(provider.name).toBe("gmail");
    });

    it("sends email successfully", async () => {
        mockGetValidGmailToken.mockResolvedValue({
            access_token: "token-123",
            user_email: "sender@gmail.com",
        });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ id: "gmail-msg-123" }),
        });

        const message = {
            to: "recipient@example.com",
            from: "sender@gmail.com",
            subject: "Test Email",
            html_body: "<p>Test body</p>",
        };

        const result = await provider.sendEmail(message);

        expect(result.success).toBe(true);
        expect(result.provider_message_id).toBe("gmail-msg-123");
        expect(mockGetValidGmailToken).toHaveBeenCalledWith("agent-123");
    });

    it("handles send failure", async () => {
        mockGetValidGmailToken.mockResolvedValue({
            access_token: "token-123",
            user_email: "sender@gmail.com",
        });

        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 400,
            text: async () => "Bad request",
        });

        const message = {
            to: "recipient@example.com",
            from: "sender@gmail.com",
            subject: "Test",
            html_body: "Body",
        };

        const result = await provider.sendEmail(message);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Gmail error");
    });

    it("handles token retrieval failure", async () => {
        mockGetValidGmailToken.mockRejectedValue(new Error("Token expired"));

        const message = {
            to: "recipient@example.com",
            from: "sender@gmail.com",
            subject: "Test",
            html_body: "Body",
        };

        const result = await provider.sendEmail(message);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it("verifyWebhook returns true", () => {
        const result = provider.verifyWebhook({}, "signature");
        expect(result).toBe(true);
    });

    it("processWebhookEvent returns null", () => {
        const result = provider.processWebhookEvent({});
        expect(result).toBeNull();
    });
});
