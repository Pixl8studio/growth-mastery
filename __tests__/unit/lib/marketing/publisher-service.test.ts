/**
 * Publisher Service Tests
 * Tests for social media publishing functionality
 */

// Mock crypto BEFORE any imports
vi.mock("@/lib/integrations/crypto", () => ({
    decryptToken: vi.fn(),
    encryptToken: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import {
    publishNow,
    schedulePost,
    retryFailedPost,
    cancelScheduledPost,
    promoteToProduction,
    getPublishingQueue,
} from "@/lib/marketing/publisher-service";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { decryptToken } from "@/lib/integrations/crypto";

describe("PublisherService", () => {
    const mockUserId = "user-123";
    const mockVariantId = "variant-123";
    const mockCalendarId = "calendar-123";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("publishNow", () => {
        it("should successfully publish to Instagram when connection exists", async () => {
            const mockVariant = {
                id: mockVariantId,
                platform: "instagram",
                copy_text: "Test post",
            };

            const mockConnection = {
                provider: "instagram",
                access_token: "encrypted-token",
                account_id: "ig-account-123",
                is_active: true,
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_post_variants") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockVariant,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "funnel_social_connections") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: mockConnection,
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "marketing_content_calendar") {
                        return {
                            insert: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { id: mockCalendarId },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(decryptToken).mockResolvedValue("decrypted-token");

            const result = await publishNow(mockVariantId, "instagram", mockUserId);

            expect(result.success).toBe(true);
            expect(result.providerPostId).toBeDefined();
        });

        it("should return error when variant not found", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { message: "Not found" },
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await publishNow(mockVariantId, "instagram", mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Variant not found");
        });

        it("should return error when no active connection exists", async () => {
            const mockVariant = {
                id: mockVariantId,
                platform: "facebook",
                copy_text: "Test post",
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_post_variants") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockVariant,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "funnel_social_connections") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: null,
                                                error: { message: "Not found" },
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await publishNow(mockVariantId, "facebook", mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toContain("No active facebook connection found");
        });

        it("should handle unsupported platform", async () => {
            const mockVariant = {
                id: mockVariantId,
                platform: "unsupported",
                copy_text: "Test post",
            };

            const mockConnection = {
                provider: "unsupported",
                access_token: "encrypted-token",
                account_id: "account-123",
                is_active: true,
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_post_variants") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockVariant,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "funnel_social_connections") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: mockConnection,
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await publishNow(
                mockVariantId,
                "unsupported" as any,
                mockUserId
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain("Unsupported platform");
        });
    });

    describe("schedulePost", () => {
        it("should successfully schedule a post", async () => {
            const scheduledDate = new Date("2025-12-10T12:00:00Z");
            const mockCalendarEntry = { id: mockCalendarId };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockCalendarEntry,
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await schedulePost(
                mockVariantId,
                scheduledDate,
                mockUserId,
                "sandbox"
            );

            expect(result.success).toBe(true);
            expect(result.calendarId).toBe(mockCalendarId);
        });

        it("should handle database error when scheduling", async () => {
            const scheduledDate = new Date("2025-12-10T12:00:00Z");

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: null,
                                error: { message: "Database error" },
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await schedulePost(mockVariantId, scheduledDate, mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Database error");
        });

        it("should default to sandbox space when not specified", async () => {
            const scheduledDate = new Date("2025-12-10T12:00:00Z");
            const mockInsert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: mockCalendarId },
                        error: null,
                    }),
                }),
            });

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    insert: mockInsert,
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            await schedulePost(mockVariantId, scheduledDate, mockUserId);

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({ space: "sandbox" })
            );
        });
    });

    describe("retryFailedPost", () => {
        it("should successfully retry a failed post", async () => {
            const mockEntry = {
                id: mockCalendarId,
                user_id: mockUserId,
                retry_config: {
                    attempt_count: 0,
                    max_attempts: 3,
                },
                marketing_post_variants: {
                    id: mockVariantId,
                    platform: "twitter",
                    copy_text: "Test",
                },
            };

            const mockConnection = {
                provider: "twitter",
                access_token: "encrypted-token",
                account_id: "tw-123",
                is_active: true,
            };

            const mockSupabase = {
                from: vi.fn((table: string) => {
                    if (table === "marketing_content_calendar") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockEntry,
                                        error: null,
                                    }),
                                }),
                            }),
                            update: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({ error: null }),
                            }),
                            insert: vi.fn().mockResolvedValue({
                                data: { id: "new-calendar-123" },
                                error: null,
                            }),
                        };
                    }
                    if (table === "marketing_post_variants") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: mockEntry.marketing_post_variants,
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    if (table === "funnel_social_connections") {
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({
                                                data: mockConnection,
                                                error: null,
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
            vi.mocked(decryptToken).mockResolvedValue("decrypted-token");

            const result = await retryFailedPost(mockCalendarId);

            expect(result.success).toBe(true);
        });

        it("should fail when max retry attempts reached", async () => {
            const mockEntry = {
                id: mockCalendarId,
                user_id: mockUserId,
                retry_config: {
                    attempt_count: 3,
                    max_attempts: 3,
                },
                marketing_post_variants: {
                    id: mockVariantId,
                    platform: "linkedin",
                },
            };

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: mockEntry,
                                error: null,
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await retryFailedPost(mockCalendarId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Max retry attempts reached");
        });
    });

    describe("cancelScheduledPost", () => {
        it("should successfully cancel a scheduled post", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    delete: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({ error: null }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await cancelScheduledPost(mockCalendarId, mockUserId);

            expect(result.success).toBe(true);
        });

        it("should handle error when canceling fails", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    delete: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({
                                    error: { message: "Delete failed" },
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await cancelScheduledPost(mockCalendarId, mockUserId);

            expect(result.success).toBe(false);
            expect(result.error).toBe("Delete failed");
        });
    });

    describe("promoteToProduction", () => {
        it("should successfully promote post to production", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({ error: null }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await promoteToProduction(mockCalendarId, mockUserId);

            expect(result.success).toBe(true);
        });
    });

    describe("getPublishingQueue", () => {
        it("should fetch publishing queue successfully", async () => {
            const mockEntries = [
                {
                    id: "entry-1",
                    post_variant_id: "variant-1",
                    scheduled_publish_at: new Date().toISOString(),
                },
                {
                    id: "entry-2",
                    post_variant_id: "variant-2",
                    scheduled_publish_at: new Date().toISOString(),
                },
            ];

            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                lte: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockResolvedValue({
                                            data: mockEntries,
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getPublishingQueue();

            expect(result.success).toBe(true);
            expect(result.entries).toHaveLength(2);
        });

        it("should handle empty queue", async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                lte: vi.fn().mockReturnValue({
                                    order: vi.fn().mockReturnValue({
                                        limit: vi.fn().mockResolvedValue({
                                            data: [],
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const result = await getPublishingQueue();

            expect(result.success).toBe(true);
            expect(result.entries).toHaveLength(0);
        });
    });
});
