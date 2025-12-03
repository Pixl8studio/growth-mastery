/**
 * Brief Variants API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/marketing/briefs/[briefId]/variants/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => ({
                data: { user: { id: "user-123" } },
                error: null,
            })),
        },
        from: vi.fn((table: string) => {
            if (table === "marketing_content_briefs") {
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
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(() => ({
                                data: [{ id: "variant-1" }],
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

describe("GET /api/marketing/briefs/[briefId]/variants", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns variants for brief", async () => {
        const request = new NextRequest(
            "http://localhost/api/marketing/briefs/brief-123/variants"
        );
        const context = { params: Promise.resolve({ briefId: "brief-123" }) };
        const response = await GET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.variants).toBeDefined();
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
            "http://localhost/api/marketing/briefs/brief-123/variants"
        );
        const context = { params: Promise.resolve({ briefId: "brief-123" }) };
        const response = await GET(request, context);

        expect(response.status).toBe(401);
    });
});
