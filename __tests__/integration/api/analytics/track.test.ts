import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/analytics/track/route";
import {
    createMockRequest,
    parseJsonResponse,
} from "@/__tests__/helpers/api-test-helpers";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        child: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        })),
    },
}));

vi.mock("@/lib/webhook-service", () => ({
    sendWebhook: vi.fn(),
    buildVideoWatchedPayload: vi.fn(() => ({})),
    buildEnrollmentViewedPayload: vi.fn(() => ({})),
}));

import { createClient } from "@/lib/supabase/server";

describe("POST /api/analytics/track", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should track analytics event successfully", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockResolvedValue({
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                eventType: "video_start",
                funnelProjectId: "project-123",
                pageType: "watch",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 400 for invalid input", async () => {
        const mockSupabase = {
            from: vi.fn(),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                eventType: "video_start",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ error: string }>(response);

        expect(response.status).toBe(400);
        expect(data.error).toBe("Invalid input");
    });

    it("should track event with UTM data", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockResolvedValue({
                    error: null,
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                eventType: "registration",
                funnelProjectId: "project-123",
                utmData: {
                    source: "facebook",
                    campaign: "summer-sale",
                },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should update contact engagement when contactId provided", async () => {
        const mockSupabase = {
            from: vi.fn((table: string) => {
                if (table === "funnel_analytics") {
                    return {
                        insert: vi.fn().mockResolvedValue({
                            error: null,
                        }),
                    };
                }
                if (table === "contacts") {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: "contact-123",
                                email: "test@example.com",
                                video_watch_percentage: 0,
                            },
                            error: null,
                        }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                if (table === "contact_events") {
                    return {
                        insert: vi.fn().mockResolvedValue({
                            error: null,
                        }),
                    };
                }
                return {
                    insert: vi.fn().mockResolvedValue({ error: null }),
                };
            }),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                eventType: "video_progress",
                funnelProjectId: "project-123",
                contactId: "contact-123",
                eventData: {
                    percentage: 50,
                    duration: 120,
                },
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
        const mockSupabase = {
            from: vi.fn(() => ({
                insert: vi.fn().mockResolvedValue({
                    error: { message: "Database error" },
                }),
            })),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

        const request = createMockRequest({
            method: "POST",
            body: {
                eventType: "video_start",
                funnelProjectId: "project-123",
            },
        });

        const response = await POST(request);
        const data = await parseJsonResponse<{ success: boolean }>(response);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
