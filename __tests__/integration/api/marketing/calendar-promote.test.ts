/**
 * Calendar Promote API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/calendar/[entryId]/promote/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/marketing/publisher-service", () => ({
    promoteToProduction: vi.fn(() => Promise.resolve({ success: true })),
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
                        data: { user_id: "user-123", space: "sandbox" },
                        error: null,
                    })),
                })),
            })),
        })),
    })),
}));

describe("POST /api/marketing/calendar/[entryId]/promote", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("promotes entry to production successfully", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/calendar/entry-123/promote",
            { method: "POST", body: JSON.stringify({}) }
        );

        const context = { params: Promise.resolve({ entryId: "entry-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
    });

    it("returns 400 when entry is not in sandbox", async () => {
        vi.mocked(createClient).mockReturnValue({
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
                            data: { user_id: "user-123", space: "production" },
                            error: null,
                        })),
                    })),
                })),
            })),
        } as any);

        const request = new NextRequest(
            "http://localhost/api/marketing/calendar/entry-123/promote",
            { method: "POST", body: JSON.stringify({}) }
        );

        const context = { params: Promise.resolve({ entryId: "entry-123" }) };
        const response = await POST(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("not in sandbox");
    });
});
