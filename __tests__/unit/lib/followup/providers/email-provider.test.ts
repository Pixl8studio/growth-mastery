/**
 * Tests for Email Providers
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

// Import providers
const { ConsoleEmailProvider } = await import(
    "@/lib/followup/providers/email-provider"
);

describe("Email Providers", () => {
    describe("ConsoleEmailProvider", () => {
        let provider: any;

        beforeEach(() => {
            provider = new ConsoleEmailProvider();
            vi.clearAllMocks();
        });

        it("has correct name", () => {
            expect(provider.name).toBe("console");
        });

        it("sends email successfully", async () => {
            const message = {
                to: "test@example.com",
                from: "sender@example.com",
                subject: "Test Email",
                html_body: "<p>Test body</p>",
            };

            const result = await provider.sendEmail(message);

            expect(result.success).toBe(true);
            expect(result.provider_message_id).toBeDefined();
            expect(result.provider_message_id).toContain("console-");
        });

        it("generates unique message IDs", async () => {
            const message = {
                to: "test@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "Body",
            };

            const result1 = await provider.sendEmail(message);
            const result2 = await provider.sendEmail(message);

            expect(result1.provider_message_id).not.toBe(result2.provider_message_id);
        });

        it("verifyWebhook always returns true", () => {
            const result = provider.verifyWebhook({}, "signature");
            expect(result).toBe(true);
        });

        it("processWebhookEvent returns null", () => {
            const result = provider.processWebhookEvent({});
            expect(result).toBeNull();
        });

        it("handles email with all fields", async () => {
            const message = {
                to: "test@example.com",
                from: "sender@example.com",
                subject: "Test Email",
                html_body: "<p>Test body</p>",
                text_body: "Test body",
                reply_to: "reply@example.com",
                tracking_enabled: true,
                metadata: { key: "value" },
            };

            const result = await provider.sendEmail(message);

            expect(result.success).toBe(true);
        });
    });
});
