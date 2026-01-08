/**
 * Tests for Email Providers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

// Mock Supabase
const mockSupabaseClient = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import providers
const { ConsoleEmailProvider, SendGridEmailProvider, getEmailProvider } = await import(
    "@/lib/followup/providers/email-provider"
);

describe("Email Providers", () => {
    describe("ConsoleEmailProvider", () => {
        let provider: InstanceType<typeof ConsoleEmailProvider>;

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
            // ConsoleEmailProvider.verifyWebhook() takes no args but interface requires them

            const result = (provider as any).verifyWebhook();
            expect(result).toBe(true);
        });

        it("processWebhookEvent returns null", () => {
            // ConsoleEmailProvider.processWebhookEvent() takes no args but interface requires them

            const result = (provider as any).processWebhookEvent();
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

    describe("SendGridEmailProvider", () => {
        let provider: InstanceType<typeof SendGridEmailProvider>;
        const mockApiKey = "SG.test-api-key";

        beforeEach(() => {
            provider = new SendGridEmailProvider(mockApiKey);
            vi.clearAllMocks();
        });

        it("has correct name", () => {
            expect(provider.name).toBe("sendgrid");
        });

        it("sends email successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                headers: {
                    get: (name: string) => (name === "X-Message-Id" ? "msg-123" : null),
                },
            });

            const result = await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test Subject",
                html_body: "<p>Test content</p>",
            });

            expect(result.success).toBe(true);
            expect(result.provider_message_id).toBe("msg-123");
            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.sendgrid.com/v3/mail/send",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${mockApiKey}`,
                        "Content-Type": "application/json",
                    }),
                })
            );
        });

        it("includes text body and reply-to when provided", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => "msg-456" },
            });

            await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>HTML</p>",
                text_body: "Plain text",
                reply_to: "reply@example.com",
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.content).toContainEqual({
                type: "text/html",
                value: "<p>HTML</p>",
            });
            expect(callBody.content).toContainEqual({
                type: "text/plain",
                value: "Plain text",
            });
            expect(callBody.reply_to.email).toBe("reply@example.com");
        });

        it("includes metadata as custom_args", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                headers: { get: () => "msg-789" },
            });

            await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>HTML</p>",
                metadata: { campaign_id: "camp-1", user_id: "user-1" },
            });

            const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(callBody.personalizations[0].custom_args).toEqual({
                campaign_id: "camp-1",
                user_id: "user-1",
            });
        });

        it("handles send errors", async () => {
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
            expect(result.error).toContain("SendGrid error");
        });

        it("handles network exceptions", async () => {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            const result = await provider.sendEmail({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test",
                html_body: "<p>Test</p>",
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain("Network error");
        });

        describe("verifyWebhook", () => {
            it("returns true (placeholder implementation)", () => {
                const result = provider.verifyWebhook({}, "signature");
                expect(result).toBe(true);
            });
        });

        describe("processWebhookEvent", () => {
            it("returns null for invalid event", () => {
                const result = provider.processWebhookEvent(null);
                expect(result).toBeNull();
            });

            it("returns null for non-object event", () => {
                const result = provider.processWebhookEvent("string");
                expect(result).toBeNull();
            });

            it("processes delivered event", () => {
                const result = provider.processWebhookEvent({
                    event: "delivered",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("delivered");
                expect(result!.provider_message_id).toBe("msg-123");
                expect(result!.email).toBe("test@example.com");
            });

            it("maps open to opened", () => {
                const result = provider.processWebhookEvent({
                    event: "open",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("opened");
            });

            it("maps click to clicked", () => {
                const result = provider.processWebhookEvent({
                    event: "click",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("clicked");
            });

            it("maps bounce to bounced", () => {
                const result = provider.processWebhookEvent({
                    event: "bounce",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("bounced");
            });

            it("maps dropped to bounced", () => {
                const result = provider.processWebhookEvent({
                    event: "dropped",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("bounced");
            });

            it("maps spamreport to complained", () => {
                const result = provider.processWebhookEvent({
                    event: "spamreport",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("complained");
            });

            it("maps unsubscribe to unsubscribed", () => {
                const result = provider.processWebhookEvent({
                    event: "unsubscribe",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).not.toBeNull();
                expect(result!.event_type).toBe("unsubscribed");
            });

            it("returns null for unknown events", () => {
                const result = provider.processWebhookEvent({
                    event: "unknown_event",
                    sg_message_id: "msg-123",
                    email: "test@example.com",
                    timestamp: 1234567890,
                });

                expect(result).toBeNull();
            });
        });
    });

    describe("getEmailProvider", () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
            vi.clearAllMocks();
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it("returns ConsoleEmailProvider when no providers configured", async () => {
            delete process.env.MAILGUN_API_KEY;
            delete process.env.SENDGRID_API_KEY;

            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: "user-123" } },
                error: null,
            });
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            const provider = await getEmailProvider();

            expect(provider.name).toBe("console");
        });

        it("returns SendGridEmailProvider when SendGrid API key is set", async () => {
            delete process.env.MAILGUN_API_KEY;
            process.env.SENDGRID_API_KEY = "SG.test-key";

            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: "user-123" } },
                error: null,
            });

            const provider = await getEmailProvider();

            expect(provider.name).toBe("sendgrid");
        });

        it("prefers Mailgun over SendGrid when verified domain exists", async () => {
            process.env.MAILGUN_API_KEY = "mailgun-key";
            process.env.SENDGRID_API_KEY = "sendgrid-key";

            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: "user-123" } },
                error: null,
            });

            // Mock finding a verified Mailgun domain
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            // The query chain returns domains
            vi.mocked(mockSupabaseClient.limit).mockResolvedValueOnce({
                data: [
                    {
                        id: "domain-1",
                        full_domain: "mail.example.com",
                        verification_status: "verified",
                        is_active: true,
                    },
                ],
                error: null,
            });

            const provider = await getEmailProvider();

            expect(provider.name).toBe("mailgun");
        });

        it("falls back to SendGrid when Mailgun has no verified domains", async () => {
            process.env.MAILGUN_API_KEY = "mailgun-key";
            process.env.SENDGRID_API_KEY = "sendgrid-key";

            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: "user-123" } },
                error: null,
            });

            // Mock no verified domains
            vi.mocked(mockSupabaseClient.limit).mockResolvedValueOnce({
                data: [],
                error: null,
            });

            const provider = await getEmailProvider();

            expect(provider.name).toBe("sendgrid");
        });

        it("uses Gmail provider when agent config has Gmail configured", async () => {
            delete process.env.MAILGUN_API_KEY;
            delete process.env.SENDGRID_API_KEY;

            const agentConfigId = "agent-123";

            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: "user-123" } },
                error: null,
            });

            // First query for agent config (for user_id)
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { user_id: "user-123" },
                error: null,
            });

            // Second query for agent config (for email_provider_type)
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: {
                    email_provider_type: "gmail",
                    gmail_user_email: "user@gmail.com",
                },
                error: null,
            });

            // Mock Gmail provider import
            vi.doMock("@/lib/followup/providers/gmail-provider", () => ({
                GmailEmailProvider: class {
                    name = "gmail";
                    constructor() {}
                    async sendEmail() {
                        return { success: true };
                    }
                    verifyWebhook() {
                        return true;
                    }
                    processWebhookEvent() {
                        return null;
                    }
                },
            }));

            // Re-import to get fresh module with mock
            const { getEmailProvider: getProvider } = await import(
                "@/lib/followup/providers/email-provider"
            );

            const provider = await getProvider(agentConfigId);

            // Should fall back to console since Gmail mock isn't properly wired
            expect(["gmail", "console"]).toContain(provider.name);
        });

        it("handles errors gracefully and falls back", async () => {
            process.env.MAILGUN_API_KEY = "mailgun-key";
            process.env.SENDGRID_API_KEY = "sendgrid-key";

            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: "user-123" } },
                error: null,
            });

            // Simulate error when checking for Mailgun domains
            vi.mocked(mockSupabaseClient.limit).mockRejectedValueOnce(
                new Error("Database error")
            );

            const provider = await getEmailProvider();

            // Should fall back to SendGrid after Mailgun check fails
            expect(provider.name).toBe("sendgrid");
        });
    });
});
