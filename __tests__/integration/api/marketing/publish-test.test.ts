/**
 * Publish Test API Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/marketing/publish/test/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/marketing/preflight-service", () => ({
    runPreflightValidation: vi.fn(() =>
        Promise.resolve({
            success: true,
            result: { passed: true, issues: [] },
        })
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
            if (table === "marketing_post_variants") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: {
                                    id: "variant-123",
                                    user_id: "user-123",
                                    platform: "instagram",
                                    content_brief_id: "brief-123",
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            if (table === "marketing_content_briefs") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(() => ({
                                data: { marketing_profile_id: "profile-123" },
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

describe("POST /api/marketing/publish/test", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("validates content successfully", async () => {
        const request = new NextRequest("http://localhost/api/marketing/publish/test", {
            method: "POST",
            body: JSON.stringify({
                post_variant_id: "variant-123",
            }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.validation).toBeDefined();
        expect(data.ready_to_publish).toBe(true);
    });

    it("returns 400 when post_variant_id is missing", async () => {
        const request = new NextRequest("http://localhost/api/marketing/publish/test", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("post_variant_id is required");
    });
});
