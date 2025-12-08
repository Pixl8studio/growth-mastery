/**
 * Mailgun Email Provider Tests
 * Tests for white-label email delivery via Mailgun API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as crypto from "crypto";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import providers using dynamic import (after mocks are set up)
const { MailgunEmailProvider, getMailgunProvider } = await import(
    "@/lib/followup/providers/mailgun-provider"
);

describe("MailgunEmailProvider", () => {
    const mockApiKey = "test-api-key";
    const mockDomain = "mail.example.com";
    let provider: InstanceType<typeof MailgunEmailProvider>;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new MailgunEmailProvider(mockApiKey, mockDomain);
    });

    describe("constructor", () => {
        it("should use US region by default", () => {
            const usProvider = new MailgunEmailProvider(mockApiKey, mockDomain);
            expect(usProvider.name).toBe("mailgun");
        });

        it("should support EU region", () => {
            const euProvider = new MailgunEmailProvider(mockApiKey, mockDomain, "eu");
            expect(euProvider.name).toBe("mailgun");
        });
    });

    describe("sendEmail", () => {
        it("should send email successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        id: "message-id-123",
                        message: "Queued. Thank you.",
                    }),
            });

            const result = await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test Subject",
                html_body: "<p>Test content</p>",
            });

            expect(result.success).toBe(true);
            expect(result.provider_message_id).toBe("message-id-123");
            expect(mockFetch).toHaveBeenCalledWith(
                `https://api.mailgun.net/v3/${mockDomain}/messages`,
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: expect.stringContaining("Basic"),
                    }),
                })
            );
        });

        it("should include text body when provided", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: "msg-123" }),
            });

            await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>HTML</p>",
                text_body: "Plain text",
            });

            expect(mockFetch).toHaveBeenCalled();
        });

        it("should include reply-to when provided", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: "msg-123" }),
            });

            await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>HTML</p>",
                reply_to: "reply@example.com",
            });

            expect(mockFetch).toHaveBeenCalled();
        });

        it("should include metadata as custom variables", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: "msg-123" }),
            });

            await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>HTML</p>",
                metadata: {
                    user_id: "user-123",
                    campaign: "welcome",
                },
            });

            expect(mockFetch).toHaveBeenCalled();
        });

        it("should handle send errors", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: () => Promise.resolve("Invalid recipient"),
            });

            const result = await provider.sendEmail({
                to: "invalid",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>Test</p>",
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("Mailgun error");
        });

        it("should handle network exceptions", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const result = await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>Test</p>",
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe("Network error");
        });

        it("should use EU endpoint when configured", async () => {
            const euProvider = new MailgunEmailProvider(mockApiKey, mockDomain, "eu");

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: "msg-123" }),
            });

            await euProvider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>Test</p>",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("api.eu.mailgun.net"),
                expect.anything()
            );
        });
    });

    describe("verifyWebhook", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it("should return false when signing key not configured", () => {
            delete process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

            const result = provider.verifyWebhook({}, "signature");

            expect(result).toBe(false);
        });

        it("should return false when payload has no signature", () => {
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY = "test-key";

            const result = provider.verifyWebhook({ data: "test" }, "");

            expect(result).toBe(false);
        });

        it("should return false when signature data is incomplete", () => {
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY = "test-key";

            const result = provider.verifyWebhook(
                {
                    signature: {
                        timestamp: "123",
                    },
                },
                ""
            );

            expect(result).toBe(false);
        });

        it("should verify valid signature", () => {
            const signingKey = "test-signing-key";
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY = signingKey;

            const timestamp = "1234567890";
            const token = "random-token";
            const expectedSignature = crypto
                .createHmac("sha256", signingKey)
                .update(`${timestamp}${token}`)
                .digest("hex");

            const result = provider.verifyWebhook(
                {
                    signature: {
                        timestamp,
                        token,
                        signature: expectedSignature,
                    },
                },
                ""
            );

            expect(result).toBe(true);
        });

        it("should reject invalid signature", () => {
            process.env.MAILGUN_WEBHOOK_SIGNING_KEY = "test-key";

            const result = provider.verifyWebhook(
                {
                    signature: {
                        timestamp: "123",
                        token: "token",
                        signature: "invalid-signature",
                    },
                },
                ""
            );

            expect(result).toBe(false);
        });
    });

    describe("processWebhookEvent", () => {
        it("should return null for empty event data", () => {
            const result = provider.processWebhookEvent({});

            expect(result).toBeNull();
        });

        it("should process delivered event", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "delivered",
                    message: {
                        headers: {
                            "message-id": "msg-123",
                        },
                    },
                    recipient: "test@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).not.toBeNull();
            expect(result!.event_type).toBe("delivered");
            expect(result!.provider_message_id).toBe("msg-123");
            expect(result!.email).toBe("test@example.com");
        });

        it("should process opened event", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "opened",
                    message: { headers: { "message-id": "msg-456" } },
                    recipient: "user@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).not.toBeNull();
            expect(result!.event_type).toBe("opened");
        });

        it("should process clicked event", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "clicked",
                    message: { headers: { "message-id": "msg-789" } },
                    recipient: "click@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).not.toBeNull();
            expect(result!.event_type).toBe("clicked");
        });

        it("should map failed to bounced", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "failed",
                    message: { headers: { "message-id": "msg-fail" } },
                    recipient: "bounce@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).not.toBeNull();
            expect(result!.event_type).toBe("bounced");
        });

        it("should process complained event", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "complained",
                    message: { headers: { "message-id": "msg-spam" } },
                    recipient: "spam@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).not.toBeNull();
            expect(result!.event_type).toBe("complained");
        });

        it("should process unsubscribed event", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "unsubscribed",
                    message: { headers: { "message-id": "msg-unsub" } },
                    recipient: "unsub@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).not.toBeNull();
            expect(result!.event_type).toBe("unsubscribed");
        });

        it("should return null for unknown event types", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "unknown_event",
                    message: { headers: { "message-id": "msg-123" } },
                    recipient: "test@example.com",
                    timestamp: 1234567890,
                },
            });

            expect(result).toBeNull();
        });

        it("should include user variables in metadata", () => {
            const result = provider.processWebhookEvent({
                "event-data": {
                    event: "delivered",
                    message: { headers: { "message-id": "msg-123" } },
                    recipient: "test@example.com",
                    timestamp: 1234567890,
                    "user-variables": {
                        campaign_id: "camp-1",
                        user_id: "user-1",
                    },
                },
            });

            expect(result).not.toBeNull();
            expect(result!.metadata).toEqual({
                campaign_id: "camp-1",
                user_id: "user-1",
            });
        });
    });

    describe("Domain Management", () => {
        describe("createDomain", () => {
            it("should create domain successfully", async () => {
                const mockResponse = {
                    domain: { name: "new.example.com" },
                    sending_dns_records: [],
                };

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse),
                });

                const result = await provider.createDomain("new.example.com");

                expect(result).toEqual(mockResponse);
                expect(mockFetch).toHaveBeenCalledWith(
                    "https://api.mailgun.net/v3/domains",
                    expect.objectContaining({ method: "POST" })
                );
            });

            it("should return null on creation failure", async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    text: () => Promise.resolve("Domain already exists"),
                });

                const result = await provider.createDomain("existing.com");

                expect(result).toBeNull();
            });

            it("should handle exceptions", async () => {
                mockFetch.mockRejectedValueOnce(new Error("Network error"));

                const result = await provider.createDomain("error.com");

                expect(result).toBeNull();
            });
        });

        describe("getDomainInfo", () => {
            it("should get domain info successfully", async () => {
                const mockResponse = {
                    domain: { name: "test.example.com", state: "active" },
                };

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse),
                });

                const result = await provider.getDomainInfo("test.example.com");

                expect(result).toEqual(mockResponse);
            });

            it("should return null on failure", async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    text: () => Promise.resolve("Not found"),
                });

                const result = await provider.getDomainInfo("missing.com");

                expect(result).toBeNull();
            });

            it("should handle exceptions", async () => {
                mockFetch.mockRejectedValueOnce(new Error("Error"));

                const result = await provider.getDomainInfo("error.com");

                expect(result).toBeNull();
            });
        });

        describe("verifyDomain", () => {
            it("should verify domain with all records valid", async () => {
                mockFetch
                    // First call: trigger verification
                    .mockResolvedValueOnce({ ok: true })
                    // Second call: get domain info
                    .mockResolvedValueOnce({
                        ok: true,
                        json: () =>
                            Promise.resolve({
                                sending_dns_records: [
                                    { record_type: "TXT", valid: "valid" },
                                    { record_type: "CNAME", valid: "valid" },
                                ],
                                receiving_dns_records: [],
                            }),
                    });

                const result = await provider.verifyDomain("verified.com");

                expect(result).not.toBeNull();
                expect(result!.verified).toBe(true);
                expect(result!.dns_records).toHaveLength(2);
            });

            it("should return not verified when records invalid", async () => {
                mockFetch.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            sending_dns_records: [
                                { record_type: "TXT", valid: "invalid" },
                            ],
                            receiving_dns_records: [],
                        }),
                });

                const result = await provider.verifyDomain("unverified.com");

                expect(result).not.toBeNull();
                expect(result!.verified).toBe(false);
            });

            it("should return null when domain info fetch fails", async () => {
                mockFetch.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({
                    ok: false,
                    text: () => Promise.resolve("Error"),
                });

                const result = await provider.verifyDomain("error.com");

                expect(result).toBeNull();
            });

            it("should handle exceptions", async () => {
                mockFetch.mockRejectedValueOnce(new Error("Network error"));

                const result = await provider.verifyDomain("exception.com");

                expect(result).toBeNull();
            });
        });

        describe("deleteDomain", () => {
            it("should delete domain successfully", async () => {
                mockFetch.mockResolvedValueOnce({ ok: true });

                const result = await provider.deleteDomain("delete.example.com");

                expect(result).toBe(true);
                expect(mockFetch).toHaveBeenCalledWith(
                    "https://api.mailgun.net/v3/domains/delete.example.com",
                    expect.objectContaining({ method: "DELETE" })
                );
            });

            it("should return false on deletion failure", async () => {
                mockFetch.mockResolvedValueOnce({
                    ok: false,
                    text: () => Promise.resolve("Cannot delete"),
                });

                const result = await provider.deleteDomain("nodelete.com");

                expect(result).toBe(false);
            });

            it("should handle exceptions", async () => {
                mockFetch.mockRejectedValueOnce(new Error("Error"));

                const result = await provider.deleteDomain("error.com");

                expect(result).toBe(false);
            });
        });
    });
});

describe("getMailgunProvider", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should return null when API key not configured", async () => {
        delete process.env.MAILGUN_API_KEY;

        const result = await getMailgunProvider("test.com");

        expect(result).toBeNull();
    });

    it("should return provider with API key", async () => {
        process.env.MAILGUN_API_KEY = "test-key";

        const result = await getMailgunProvider("test.com");

        expect(result).toBeInstanceOf(MailgunEmailProvider);
    });

    it("should use US region by default", async () => {
        process.env.MAILGUN_API_KEY = "test-key";
        delete process.env.MAILGUN_REGION;

        const result = await getMailgunProvider("test.com");

        expect(result).not.toBeNull();
    });

    it("should use configured region", async () => {
        process.env.MAILGUN_API_KEY = "test-key";
        process.env.MAILGUN_REGION = "eu";

        const result = await getMailgunProvider("test.com");

        expect(result).not.toBeNull();
    });
});
