/**
 * Tests for SMS Providers
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
const { ConsoleSMSProvider } = await import("@/lib/followup/providers/sms-provider");

describe("SMS Providers", () => {
    describe("ConsoleSMSProvider", () => {
        let provider: any;

        beforeEach(() => {
            provider = new ConsoleSMSProvider();
            vi.clearAllMocks();
        });

        it("has correct name", () => {
            expect(provider.name).toBe("console");
        });

        it("sends SMS successfully", async () => {
            const message = {
                to: "+15555551234",
                from: "+15555554321",
                body: "Test SMS message",
            };

            const result = await provider.sendSMS(message);

            expect(result.success).toBe(true);
            expect(result.provider_message_id).toBeDefined();
            expect(result.provider_message_id).toContain("console-sms-");
        });

        it("generates unique message IDs", async () => {
            const message = {
                to: "+15555551234",
                from: "+15555554321",
                body: "Test",
            };

            const result1 = await provider.sendSMS(message);
            const result2 = await provider.sendSMS(message);

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

        it("handles SMS with metadata", async () => {
            const message = {
                to: "+15555551234",
                from: "+15555554321",
                body: "Test message",
                metadata: { delivery_id: "123", prospect_id: "456" },
            };

            const result = await provider.sendSMS(message);

            expect(result.success).toBe(true);
        });

        it("handles long SMS messages", async () => {
            const longBody = "A".repeat(500);
            const message = {
                to: "+15555551234",
                from: "+15555554321",
                body: longBody,
            };

            const result = await provider.sendSMS(message);

            expect(result.success).toBe(true);
        });
    });
});
