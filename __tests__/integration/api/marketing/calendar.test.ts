/**
 * Calendar API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/marketing/calendar/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/publisher-service", () => ({
    schedulePost: vi.fn(() =>
        Promise.resolve({ success: true, calendarId: "calendar-123" })
    ),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn((table: string) => {
            if (table === "marketing_content_calendar") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(() => ({
                                data: [{ id: "entry-1" }],
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: { user_id: "user-123" },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            return {};
        }),
    })),
}));

describe("GET /api/marketing/calendar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns calendar entries", async () => {
        const request = new NextRequest("http://localhost/api/marketing/calendar");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.entries).toBeDefined();
    });

    it("returns 401 for unauthenticated requests", async () => {
        vi.mocked(await import("@/lib/supabase/server")).createClient = vi.fn(
            () =>
                ({
                    auth: {
                        getUser: vi.fn(() => ({
                            data: { user: null },
                            error: new Error("Not authenticated"),
                        })),
                    },
                }) as any
        );

        const request = new NextRequest("http://localhost/api/marketing/calendar");
        const response = await GET(request);

        expect(response.status).toBe(401);
    });
});

describe("POST /api/marketing/calendar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("schedules a post successfully", async () => {
        const request = new NextRequest("http://localhost/api/marketing/calendar", {
            method: "POST",
            body: JSON.stringify({
                post_variant_id: "variant-123",
                scheduled_publish_at: new Date().toISOString(),
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("returns 400 when post_variant_id is missing", async () => {
        const request = new NextRequest("http://localhost/api/marketing/calendar", {
            method: "POST",
            body: JSON.stringify({
                scheduled_publish_at: new Date().toISOString(),
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("post_variant_id is required");
    });
});
