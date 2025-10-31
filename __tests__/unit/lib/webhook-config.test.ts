/**
 * Tests for page-level webhook configuration logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            warn: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
        })),
    },
}));

describe("Webhook Configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getWebhookConfig", () => {
        it("should return global config when no page context provided", async () => {
            const { createClient } = await import("@/lib/supabase/server");
            const { getWebhookConfig } = await import("@/lib/webhook-service");

            const mockSupabase = {
                from: vi.fn(() => ({
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() =>
                                Promise.resolve({
                                    data: {
                                        webhook_enabled: true,
                                        crm_webhook_url: "https://global.webhook.com",
                                        webhook_secret: "global-secret",
                                    },
                                    error: null,
                                })
                            ),
                        })),
                    })),
                })),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

            const config = await getWebhookConfig("user-123");

            expect(config).toEqual({
                enabled: true,
                url: "https://global.webhook.com",
                secret: "global-secret",
                isInherited: false,
            });
        });

        it("should return page-specific config when page overrides global", async () => {
            const { createClient } = await import("@/lib/supabase/server");
            const { getWebhookConfig } = await import("@/lib/webhook-service");

            const mockSupabase = {
                from: vi.fn((table) => {
                    if (table === "user_profiles") {
                        return {
                            select: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: {
                                                webhook_enabled: true,
                                                crm_webhook_url:
                                                    "https://global.webhook.com",
                                                webhook_secret: "global-secret",
                                            },
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        };
                    }
                    // registration_pages table
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            webhook_enabled: true,
                                            webhook_url: "https://page.webhook.com",
                                            webhook_secret: "page-secret",
                                            webhook_inherit_global: false,
                                        },
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                    };
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

            const config = await getWebhookConfig(
                "user-123",
                "page-456",
                "registration"
            );

            expect(config).toEqual({
                enabled: true,
                url: "https://page.webhook.com",
                secret: "page-secret",
                isInherited: false,
            });
        });

        it("should inherit global config when page has inherit_global enabled", async () => {
            const { createClient } = await import("@/lib/supabase/server");
            const { getWebhookConfig } = await import("@/lib/webhook-service");

            const mockSupabase = {
                from: vi.fn((table) => {
                    if (table === "user_profiles") {
                        return {
                            select: vi.fn(() => ({
                                eq: vi.fn(() => ({
                                    single: vi.fn(() =>
                                        Promise.resolve({
                                            data: {
                                                webhook_enabled: true,
                                                crm_webhook_url:
                                                    "https://global.webhook.com",
                                                webhook_secret: "global-secret",
                                            },
                                            error: null,
                                        })
                                    ),
                                })),
                            })),
                        };
                    }
                    // registration_pages table
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(() =>
                                    Promise.resolve({
                                        data: {
                                            webhook_enabled: null,
                                            webhook_url: null,
                                            webhook_secret: null,
                                            webhook_inherit_global: true,
                                        },
                                        error: null,
                                    })
                                ),
                            })),
                        })),
                    };
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

            const config = await getWebhookConfig(
                "user-123",
                "page-456",
                "registration"
            );

            expect(config).toEqual({
                enabled: true,
                url: "https://global.webhook.com",
                secret: "global-secret",
                isInherited: true,
            });
        });

        it("should use correct table name for different page types", async () => {
            const { createClient } = await import("@/lib/supabase/server");
            const { getWebhookConfig } = await import("@/lib/webhook-service");

            const fromSpy = vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(() =>
                            Promise.resolve({
                                data: {
                                    webhook_enabled: null,
                                    webhook_url: null,
                                    webhook_secret: null,
                                    webhook_inherit_global: true,
                                },
                                error: null,
                            })
                        ),
                    })),
                })),
            }));

            const mockSupabase = {
                from: fromSpy,
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as never);

            // Test registration page
            await getWebhookConfig("user-123", "page-1", "registration");
            expect(fromSpy).toHaveBeenCalledWith("registration_pages");

            fromSpy.mockClear();

            // Test enrollment page
            await getWebhookConfig("user-123", "page-2", "enrollment");
            expect(fromSpy).toHaveBeenCalledWith("enrollment_pages");

            fromSpy.mockClear();

            // Test watch page
            await getWebhookConfig("user-123", "page-3", "watch");
            expect(fromSpy).toHaveBeenCalledWith("watch_pages");
        });
    });
});
