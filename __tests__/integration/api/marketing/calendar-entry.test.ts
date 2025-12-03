/**
 * Calendar Entry API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "@/app/api/marketing/calendar/[entryId]/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/publisher-service", () => ({
    cancelScheduledPost: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => ({
                        data: { user_id: "user-123" },
                        error: null,
                    })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(() => ({
                            data: { id: "entry-123" },
                            error: null,
                        })),
                    })),
                })),
            })),
        })),
    })),
}));

describe("PUT /api/marketing/calendar/[entryId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("updates calendar entry successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/calendar/entry-123",
            {
                method: "PUT",
                body: JSON.stringify({
                    scheduled_publish_at: new Date().toISOString(),
                }),
            }
        );

        const context = { params: Promise.resolve({ entryId: "entry-123" }) };
        const response = await PUT(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
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

        const request = new NextRequest(
            "http://localhost/api/marketing/calendar/entry-123",
            { method: "PUT", body: JSON.stringify({}) }
        );

        const context = { params: Promise.resolve({ entryId: "entry-123" }) };
        const response = await PUT(request, context);

        expect(response.status).toBe(401);
    });
});

describe("DELETE /api/marketing/calendar/[entryId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deletes calendar entry successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/calendar/entry-123",
            { method: "DELETE" }
        );

        const context = { params: Promise.resolve({ entryId: "entry-123" }) };
        const response = await DELETE(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });
});
